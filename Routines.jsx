import React, { useState } from 'react';
import Routine from './Routine';

const initialRoutines = [
  {
    id: 1,
    name: 'Morning Workout',
    exercises: [
      { id: 1, name: 'Push-ups', sets: 3, reps: 15 },
      { id: 2, name: 'Squats', sets: 3, reps: 20 }
    ]
  },
  {
    id: 2,
    name: 'Evening Stretch',
    exercises: [
      { id: 1, name: 'Downward Dog', sets: 1, reps: 1 },
      { id: 2, name: 'Cat-Cow', sets: 2, reps: 10 }
    ]
  }
];

export default function Routines() {
  const [routines, setRoutines] = useState(initialRoutines);

  const handleUpdateRoutine = (updatedRoutine) => {
    setRoutines(routines.map(r => (r.id === updatedRoutine.id ? updatedRoutine : r)));
  };

  const handleDeleteRoutine = (routineId) => {
    setRoutines(routines.filter(r => r.id !== routineId));
  };

  return (
    <div>
      <h2>Your Routines</h2>
      {routines.map(routine => (
        <Routine key={routine.id} routine={routine} onUpdateRoutine={handleUpdateRoutine} onDeleteRoutine={handleDeleteRoutine} />
      ))}
    </div>
  );
}