import { QueryClient } from '@tanstack/react-query';

export const getStaticContext = () => {
  return [
    "You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.",
    "Your tone is supportive and highly scientific. You rely on data to make decisions.",
    "Never output raw JSON or code blocks unless requested. Format your output nicely using markdown.",
    "",
    "CRITICAL RULES:",
    "- ONLY use your \"Read-Only\" tools (like analyze_workout_history) if the user asks for deep historical data (e.g. \"What did I do last Tuesday?\" or \"How has my weight changed this month?\").",
    "- If they want to create or update something, use your \"Write\" tools ('create_routine', 'create_exercise', 'update_macros', 'update_active_workout', 'modify_saved_routine').",
    "- STRICT RULE: ONLY use \"Write\" tools if the user EXPLICITLY asks you to create or update something. Do NOT volunteer to call write tools on your own.",
    "- STRICT RULE: If the user asks you to modify, update, or condense their active workout, you MUST use the `update_active_workout` tool. NEVER just output a text list of exercises in your chat response. You MUST call the tool.",
    "- STRICT RULE: If the user asks to reorder, sort, or prioritize exercises by type (e.g. 'put compound first'), you MUST call the `sort_active_workout` tool. Do NOT manually sort the list yourself.",
    "- STRICT RULE: If the user asks how to perform an exercise, what muscles it targets, or for a video guide, you MUST call the `search_exercise_knowledge` tool.",
    "Use local device time for ALL temporal logic."
  ].join('\n');
};

export const getDynamicContext = (queryClient: QueryClient) => {
  // 1. Fetch zero-shot context from react-query cache
  const todayDate = new Date().toISOString().split('T')[0];
  
  // Body Metrics
  const metrics: any = queryClient.getQueryData(['bodyMetrics']) || {};
  const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
  const weightLbs = weighIns && weighIns.length > 0 ? parseFloat(weighIns[0].weight) : 'Unknown';
  let bodyContext = `Body Metrics: Age: ${metrics.age || '?'}, Height: ${metrics.height_cm || '?'}cm, Weight: ${weightLbs}lbs, Activity: ${metrics.activity_level || '?'}.`;

  // Macros & Hydration
  const macroGoals: any = queryClient.getQueryData(['macroGoals']) || {};
  const dailyMacros: any = queryClient.getQueryData(['dailyMacros', todayDate]) || {};
  const hydration = queryClient.getQueryData(['hydration', todayDate]) || 0;
  const waterGoal = queryClient.getQueryData(['waterGoal']) || 2000;
  
  const macroContext = `Today's Intake vs Goals: 
- Calories: ${dailyMacros.calories || 0}/${macroGoals.calories || 0} kcal
- Protein: ${dailyMacros.protein || 0}/${macroGoals.protein || 0} g
- Carbs: ${dailyMacros.carbs || 0}/${macroGoals.carbs || 0} g
- Fats: ${dailyMacros.fats || 0}/${macroGoals.fats || 0} g
- Hydration: ${hydration}/${waterGoal} ml`;

  // Last Workout
  const history: any[] = queryClient.getQueryData(['workoutHistory']) || [];
  let workoutContext = "Last Workout: None logged recently.";
  if (history && history.length > 0) {
    const last = history[0]; // Assuming sorted desc
    workoutContext = `Last Workout: ${last.routineName || 'Unknown Routine'} on ${last.date?.split('T')[0] || '?'} (Volume: ${last.totalVolume || 0} lbs)`;
  }

  // Active Live Session
  let activeSessionContext = "ACTIVE LIVE WORKOUT: None.";
  try {
    const activeSessionStr = localStorage.getItem('pulseV3-activeSession');
    if (activeSessionStr) {
       const session = JSON.parse(activeSessionStr);
       if (session && session.exercises) {
          const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
          const exStrings = session.exercises.map((e: any) => {
             const name = e.exerciseName || e.name;
             const dbEx = allExercises.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
             const risk = dbEx?.spinalRisk || 'Supported / Safe';
             const mType = dbEx?.movementType || 'Unknown';
             const target = dbEx?.muscleGroup || 'Unknown';
             const eq = dbEx?.equipment || 'Unknown';
             return `"${name}" [Muscle: ${target} | Type: ${mType} | Eq: ${eq} | Risk: ${risk}]`;
          });
          activeSessionContext = `ACTIVE LIVE WORKOUT (Currently on user's screen): ${session.routineName || 'Custom'}\nExercises:\n- ${exStrings.join('\n- ')}`;
       }
    }
  } catch(e) {}

  return `
--- ZERO-SHOT DAILY BRIEFING ---
You ALREADY know the following about the user. Do NOT use tools to fetch this baseline information.
${bodyContext}

${macroContext}

${workoutContext}

${activeSessionContext}
--------------------------------
`;
};
