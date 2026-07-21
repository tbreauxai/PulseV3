import { pipeline, env } from '@xenova/transformers';

// Disable local models since we are running in browser, it will fetch from HuggingFace hub and cache in IndexedDB
env.allowLocalModels = false;

interface CacheEntry {
  query: string;
  embedding: number[];
  response: string;
}

class SemanticCache {
  private static instance: SemanticCache;
  private extractor: any = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private exactCache: Map<string, string> = new Map();
  private vectorCache: CacheEntry[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SemanticCache {
    if (!SemanticCache.instance) {
      SemanticCache.instance = new SemanticCache();
    }
    return SemanticCache.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('pulse_semantic_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.vectorCache = parsed.vectorCache || [];
        this.exactCache = new Map(parsed.exactCache || []);
      }
    } catch (e) {
      console.warn("Failed to load semantic cache", e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('pulse_semantic_cache', JSON.stringify({
        vectorCache: this.vectorCache,
        exactCache: Array.from(this.exactCache.entries())
      }));
    } catch (e) {
      console.warn("Failed to save semantic cache", e);
    }
  }

  public async init() {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        console.log("[Semantic Cache] Initializing model...");
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.isInitialized = true;
        console.log("[Semantic Cache] Model initialized successfully.");
        resolve();
      } catch (err) {
        console.error("[Semantic Cache] Failed to init model", err);
        reject(err);
      }
    });

    return this.initializationPromise;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async get(query: string): Promise<string | null> {
    const normalizedQuery = query.trim().toLowerCase();
    
    // TIER 1: Exact Match
    if (this.exactCache.has(normalizedQuery)) {
      console.log("[Semantic Cache] TIER 1 HIT (Exact Match)");
      return this.exactCache.get(normalizedQuery)!;
    }

    // TIER 2: Semantic Vector Match
    if (!this.isInitialized || this.vectorCache.length === 0) return null;

    try {
      const output = await this.extractor(normalizedQuery, { pooling: 'mean', normalize: true });
      const queryEmbedding = Array.from(output.data) as number[];

      let bestMatch: CacheEntry | null = null;
      let highestSimilarity = 0;

      for (const entry of this.vectorCache) {
        const sim = this.cosineSimilarity(queryEmbedding, entry.embedding);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          bestMatch = entry;
        }
      }

      // Threshold for semantic similarity
      if (highestSimilarity > 0.95 && bestMatch) {
        console.log(`[Semantic Cache] TIER 2 HIT (Sim: ${highestSimilarity.toFixed(3)})`);
        return bestMatch.response;
      }
      
      console.log(`[Semantic Cache] MISS (Highest Sim: ${highestSimilarity.toFixed(3)})`);
    } catch (e) {
      console.error("[Semantic Cache] Error during Tier 2 search", e);
    }

    return null; // Tier 3 (LLM) required
  }

  public async set(query: string, response: string) {
    const normalizedQuery = query.trim().toLowerCase();
    this.exactCache.set(normalizedQuery, response);

    if (this.isInitialized && this.extractor) {
      try {
        const output = await this.extractor(normalizedQuery, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data) as number[];
        
        // Keep cache size manageable
        if (this.vectorCache.length > 100) {
          this.vectorCache.shift(); // remove oldest
        }
        
        this.vectorCache.push({ query: normalizedQuery, embedding, response });
      } catch (e) {
        console.error("[Semantic Cache] Failed to generate embedding for cache storage", e);
      }
    }
    
    this.saveToStorage();
  }
}

export const semanticCache = SemanticCache.getInstance();
