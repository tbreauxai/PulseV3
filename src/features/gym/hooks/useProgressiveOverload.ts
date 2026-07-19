export const calculateProgression = (exerciseName: string, history: any[]) => {
  if (!history || history.length === 0) {
    return { needsRepBump: false, needsWeightBump: false, historicalWeight: 0, historicalReps: 0 };
  }

  const daysMap = new Map<string, any[]>();
  
  history.forEach(workout => {
    if (!workout.date) return;
    const dateStr = workout.date.split('T')[0];
    
    const details = workout.exerciseDetails || [];
    const matchingExercises = details.filter((ex: any) => (ex.exerciseName || ex.name) === exerciseName);
    
    if (matchingExercises.length > 0) {
      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, []);
      }
      const existing = daysMap.get(dateStr)!;
      matchingExercises.forEach(ex => {
        if (ex.sets) existing.push(...ex.sets);
      });
    }
  });

  const sortedDates = Array.from(daysMap.keys()).sort((a, b) => b.localeCompare(a));
  
  if (sortedDates.length < 3) {
    return { needsRepBump: false, needsWeightBump: false, historicalWeight: 0, historicalReps: 0 };
  }

  const last3Dates = sortedDates.slice(0, 3);
  
  let targetWeight: number | null = null;
  let targetReps: number | null = null;

  for (const date of last3Dates) {
    const sets = daysMap.get(date)!;
    
    if (sets.length < 3) {
      return { needsRepBump: false, needsWeightBump: false, historicalWeight: 0, historicalReps: 0 };
    }

    const combos = new Map<string, number>();
    sets.forEach(set => {
      const w = parseFloat(set.weight);
      const r = parseInt(set.reps);
      if (!isNaN(w) && !isNaN(r)) {
        const key = `${w}-${r}`;
        combos.set(key, (combos.get(key) || 0) + 1);
      }
    });

    let dayTargetWeight: number | null = null;
    let dayTargetReps: number | null = null;
    
    for (const [key, count] of combos.entries()) {
      if (count >= 3) {
        const [wStr, rStr] = key.split('-');
        const w = parseFloat(wStr);
        const r = parseInt(rStr);
        if (dayTargetWeight === null || w > dayTargetWeight || (w === dayTargetWeight && r > dayTargetReps!)) {
          dayTargetWeight = w;
          dayTargetReps = r;
        }
      }
    }

    if (dayTargetWeight === null || dayTargetReps === null) {
      return { needsRepBump: false, needsWeightBump: false, historicalWeight: 0, historicalReps: 0 };
    }

    if (targetWeight === null && targetReps === null) {
      targetWeight = dayTargetWeight;
      targetReps = dayTargetReps;
    } else if (targetWeight !== dayTargetWeight || targetReps !== dayTargetReps) {
      return { needsRepBump: false, needsWeightBump: false, historicalWeight: 0, historicalReps: 0 };
    }
  }

  let needsRepBump = false;
  let needsWeightBump = false;

  if (targetReps === 8 || targetReps === 10) {
    needsRepBump = true;
  } else if (targetReps === 12) {
    needsWeightBump = true;
  }

  return {
    needsRepBump,
    needsWeightBump,
    historicalWeight: targetWeight || 0,
    historicalReps: targetReps || 0
  };
};
