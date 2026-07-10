import React, { useState } from 'react';

export default function Routine({ routine, onUpdateRoutine, onDeleteRoutine }) {
  const [isEditing, setIsEditing] = useState(false);
  // Use a separate state for the form data while editing
  const [editableRoutine, setEditableRoutine] = useState(routine);

  const handleSave = () => {
    onUpdateRoutine(editableRoutine);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset changes
    setEditableRoutine(routine);
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditableRoutine({ ...editableRoutine, [name]: value });
  };

  if (isEditing) {
    return (
      <div>
        <h3>Edit Routine</h3>
        <input
          type="text"
          name="name"
          value={editableRoutine.name}
          onChange={handleInputChange}
        />
        {/* For a real app, you'd have a more complex form here to edit exercises. */}
        <button onClick={handleSave}>Save</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div>
      <h3>{routine.name}</h3>
      <ul>
        {routine.exercises.map(exercise => (
          <li key={exercise.id}>
            {exercise.name}: {exercise.sets} sets of {exercise.reps} reps
          </li>
        ))}
      </ul>
      <button onClick={() => setIsEditing(true)}>Edit</button>
      <button onClick={() => onDeleteRoutine(routine.id)}>Delete</button>
    </div>
  );
}