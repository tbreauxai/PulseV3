export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

export interface Set {
  lbs: number | string;
  reps: number | string;
  isComplete: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: Set[];
}

export interface Routine {
  id: string;
  name: string;
  lastPerformed?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutRecord {
  id: string;
  date: string;
  routineName: string;
  duration: string;
  exercises: WorkoutExercise[];
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface WeighInLog {
  id: string;
  date: string;
  weight: string;
  diff: string;
}
