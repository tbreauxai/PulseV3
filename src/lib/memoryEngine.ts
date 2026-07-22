import Groq from 'groq-sdk';
import { semanticCache } from './semanticCache';

export interface MemoryNode {
  id: string;
  entity: string;
  relation: string;
  target: string;
  type: string; // e.g. "preference", "biomechanical", "habit"
  embedding: number[];
  timestamp: number;
}

class CognitiveMemoryEngine {
  private static instance: CognitiveMemoryEngine;
  private nodes: MemoryNode[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): CognitiveMemoryEngine {
    if (!CognitiveMemoryEngine.instance) {
      CognitiveMemoryEngine.instance = new CognitiveMemoryEngine();
    }
    return CognitiveMemoryEngine.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('pulse_memory_graph');
      if (stored) {
        this.nodes = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load memory graph", e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('pulse_memory_graph', JSON.stringify(this.nodes));
    } catch (e) {
      console.warn("Failed to save memory graph", e);
    }
  }

  /**
   * Fires asynchronously in the background. Does not block the main UI or LLM stream.
   */
  public async processMessageAsync(text: string, apiKey: string) {
    if (!text || text.length < 10) return; // skip short messages

    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      
      const prompt = `
You are an Entity Extraction Engine. Analyze the user's message and extract any long-term habits, personal preferences, biological facts, injuries, or biomechanical nuances.
Ignore transient statements (e.g. "log this workout").
Respond strictly in JSON format with a "facts" array containing objects with keys: "entity", "relation", "target", "type".
Example output:
{
  "facts": [
    {"entity": "left knee", "relation": "hurts during", "target": "heavy squats", "type": "biomechanical"},
    {"entity": "user", "relation": "dislikes", "target": "broccoli", "type": "preference"}
  ]
}`;

      let completion: any = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // @ts-ignore
          completion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: text }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: "json_object" },
            temperature: 0.0,
            // @ts-ignore
            service_tier: 'flex'
          });
          break; // success
        } catch (error: any) {
          retries++;
          if (retries >= maxRetries || (error.status !== 429 && error.status !== 503)) {
            console.warn(`[Memory Engine] Flex tier failed after ${retries} attempts:`, error);
            return; // Give up
          }
          const backoffDelay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
          console.log(`[Memory Engine] Flex capacity error. Retrying in ${Math.round(backoffDelay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      
      if (!completion) return;

      // Track usage
      if (completion.usage?.total_tokens) {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const stored = JSON.parse(localStorage.getItem('pulse_groq_usage') || '{}');
          const storedUsage = stored.date === todayStr ? (stored.tokens || 0) : 0;
          localStorage.setItem('pulse_groq_usage', JSON.stringify({ 
            date: todayStr, 
            tokens: storedUsage + completion.usage.total_tokens 
          }));
        } catch(e) {}
      }

      const responseContent = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(responseContent);
      
      if (parsed.facts && Array.isArray(parsed.facts)) {
        for (const fact of parsed.facts) {
          const factText = `${fact.entity} ${fact.relation} ${fact.target}`;
          
          // Deduplication check
          const exists = this.nodes.find(n => 
            n.entity.toLowerCase() === fact.entity.toLowerCase() && 
            n.target.toLowerCase() === fact.target.toLowerCase()
          );
          
          if (!exists) {
            const embedding = await semanticCache.getEmbedding(factText);
            if (embedding) {
              this.nodes.push({
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                entity: fact.entity,
                relation: fact.relation,
                target: fact.target,
                type: fact.type,
                embedding,
                timestamp: Date.now()
              });
              console.log("[Memory Engine] Extracted new long-term fact:", factText);
            }
          }
        }
        this.saveToStorage();
      }
    } catch (e) {
      console.warn("[Memory Engine] Extraction failed:", e);
    }
  }

  // --- Search Algorithms ---
  
  private cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  private bm25Score(queryTokens: string[], docTokens: string[]) {
    // Highly simplified BM25 for client-side
    let score = 0;
    for (const q of queryTokens) {
      if (docTokens.includes(q)) score += 1;
    }
    return score;
  }

  /**
   * 3-Way Reciprocal Rank Fusion (Vector, Keyword, Graph)
   */
  public async retrieveContext(query: string): Promise<string> {
    if (this.nodes.length === 0) return "";

    const queryEmbedding = await semanticCache.getEmbedding(query);
    const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);

    if (!queryEmbedding) return "";

    // Score all nodes
    const scoredNodes = this.nodes.map(node => {
      // 1. Vector Score
      const vectorScore = this.cosineSimilarity(queryEmbedding, node.embedding);
      
      // 2. BM25 Score
      const docStr = `${node.entity} ${node.relation} ${node.target}`.toLowerCase();
      const docTokens = docStr.split(/\W+/).filter(Boolean);
      const bm25Score = this.bm25Score(queryTokens, docTokens);
      
      // 3. Graph Score (Does the entity or target explicitly match a query term?)
      const graphScore = (queryTokens.includes(node.entity.toLowerCase()) || queryTokens.includes(node.target.toLowerCase())) ? 1 : 0;

      return { node, vectorScore, bm25Score, graphScore };
    });

    // Rank by Vector
    scoredNodes.sort((a, b) => b.vectorScore - a.vectorScore);
    const vectorRanks = new Map(scoredNodes.map((sn, i) => [sn.node.id, i + 1]));

    // Rank by BM25
    scoredNodes.sort((a, b) => b.bm25Score - a.bm25Score);
    const bm25Ranks = new Map(scoredNodes.map((sn, i) => [sn.node.id, i + 1]));

    // Rank by Graph
    scoredNodes.sort((a, b) => b.graphScore - a.graphScore);
    const graphRanks = new Map(scoredNodes.map((sn, i) => [sn.node.id, i + 1]));

    // RRF Fusion Formula: 1 / (k + rank)  -- using k=60
    const K = 60;
    const finalScores = scoredNodes.map(sn => {
      const id = sn.node.id;
      const rrf = (1 / (K + vectorRanks.get(id)!)) + 
                  (1 / (K + bm25Ranks.get(id)!)) + 
                  (1 / (K + graphRanks.get(id)!));
      return { node: sn.node, rrf };
    });

    // Sort by final RRF and take top 5
    finalScores.sort((a, b) => b.rrf - a.rrf);
    const topFacts = finalScores.slice(0, 5).filter(f => f.rrf > 0.04); // must have some baseline relevance

    if (topFacts.length === 0) return "";

    const factsStr = topFacts.map(f => `- ${f.node.entity} ${f.node.relation} ${f.node.target}`).join('\n');
    console.log("[Memory Engine] Injected facts:", factsStr);
    
    return `[USER BIOLOGICAL & HABIT MEMORY]\n${factsStr}\n\n`;
  }
}

export const memoryEngine = CognitiveMemoryEngine.getInstance();
