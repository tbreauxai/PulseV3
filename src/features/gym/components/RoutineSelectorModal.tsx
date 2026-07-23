import React from 'react';
import { Modal } from '../../../components/ui/Modal';

export const RoutineSelectorModal = ({ isOpen, onClose, routines, onSelect, activeRoutineId }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="SELECT ROUTINE" 
      description="Choose a saved workout to begin."
    >
      <div className="space-y-3">
        {routines.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No routines found.</p>
        ) : (
          routines.map(routine => (
            <div 
              key={routine.id}
              onClick={() => {
                onSelect(routine.id);
                onClose();
              }}
              className={`p-4 bg-[#0a0a0a] border-2 ${activeRoutineId === routine.id ? 'border-rose-600' : 'border-[#333]'} shadow-md rounded-xl cursor-pointer hover:border-gray-500 transition-all active:scale-[0.98]`}
            >
              <h4 className="text-white font-bold">{routine.name}</h4>
              <p className="text-xs text-gray-500 mt-1">{routine.description}</p>
              <p className="text-xs text-rose-600/80 mt-2 font-medium">
                {routine.exercises?.length || 0} exercises
              </p>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
