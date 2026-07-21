import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MuscleGroupSelectorModal } from './MuscleGroupSelectorModal';

interface ExerciseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: any) => void;
  onDelete?: (id: string) => void;
  initialData?: any;
}

export const ExerciseEditorModal = ({ isOpen, onClose, onSave, onDelete, initialData }: ExerciseEditorModalProps) => {
  const [formState, setFormState] = useState<any>({});
  const [activeMuscleSelector, setActiveMuscleSelector] = useState<'primary' | 'secondary' | null>(null);

  const getMuscleStrings = () => {
    const mg = formState.muscleGroup || '';
    if (mg.includes('|')) {
      const parts = mg.split('|');
      return { pStr: parts[0].trim(), sStr: parts[1].trim() };
    }
    const parts = mg.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return { pStr: parts[0], sStr: parts.slice(1).join(', ') };
    }
    return { pStr: '', sStr: '' };
  };

  const { pStr, sStr } = getMuscleStrings();

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || { name: '', muscleGroup: '', weight: '', reps: '', equipment: '' });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState((current: any) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = () => {
    if (!formState.name?.trim()) return;
    onSave(formState);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md space-y-4 bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">{initialData?.id ? 'EDIT EXERCISE' : 'ADD EXERCISE'}</h3>
              <p className="text-xs text-gray-400 mt-1">Update the details below.</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4 text-gray-400 rotate-45" />
            </button>
          </div>

          <div className="grid gap-4 mt-4">
            <label className="space-y-2 text-sm font-bold text-gray-300">
              NAME
              <input
                value={formState.name || ''}
                onChange={handleChange('name')}
                placeholder="Exercise name"
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
              />
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-300">
              TYPE
              <select
                value={formState.type || 'strength'}
                onChange={handleChange('type')}
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
              >
                <option value="strength">Strength (Weight / Reps)</option>
                <option value="timed">Timed Hold (Duration)</option>
                <option value="cardio">Cardio (Time / Calories)</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-300">
              MOVEMENT TYPE
              <select
                value={formState.movementType || 'Compound'}
                onChange={handleChange('movementType')}
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
              >
                <option value="Compound">Compound (Multi-Joint)</option>
                <option value="Isolation">Isolation (Single-Joint)</option>
                <option value="Isometric">Isometric (Static Hold)</option>
              </select>
            </label>
            
            <div className="space-y-2 text-sm font-bold text-gray-300">
              PRIMARY MUSCLES
              <button
                type="button"
                onClick={() => setActiveMuscleSelector('primary')}
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50 flex items-center justify-between transition-colors hover:border-gray-700 text-left"
              >
                <span className={pStr ? "line-clamp-1 pr-2 text-rose-500" : "text-gray-500"}>
                  {pStr || "Select primary muscles..."}
                </span>
              </button>
            </div>

            <div className="space-y-2 text-sm font-bold text-gray-300">
              SECONDARY MUSCLES (OPTIONAL)
              <button
                type="button"
                onClick={() => setActiveMuscleSelector('secondary')}
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50 flex items-center justify-between transition-colors hover:border-gray-700 text-left"
              >
                <span className={sStr ? "line-clamp-1 pr-2 text-gray-400" : "text-gray-500"}>
                  {sStr || "Select secondary muscles..."}
                </span>
              </button>
            </div>

            {(!formState.type || formState.type === 'strength') && (
              <>
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  WEIGHT
                  <input
                    value={formState.weight || ''}
                    onChange={handleChange('weight')}
                    placeholder="225 lbs"
                    className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                  />
                </label>
                
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  REPS
                  <input
                    value={formState.reps || ''}
                    onChange={handleChange('reps')}
                    placeholder="8-12"
                    className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                  />
                </label>
              </>
            )}

            {formState.type === 'timed' && (
              <label className="space-y-2 text-sm font-bold text-gray-300">
                DURATION (SEC)
                <input
                  type="number"
                  value={formState.time || ''}
                  onChange={handleChange('time')}
                  placeholder="60"
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                />
              </label>
            )}

            <label className="space-y-2 text-sm font-bold text-gray-300">
              MODE (EQUIPMENT)
              <select
                value={formState.equipment || ''}
                onChange={handleChange('equipment')}
                className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
              >
                <option value="" disabled className="text-gray-500">Select mode...</option>
                <option value="Barbell">Barbell</option>
                <option value="Dumbbell">Dumbbell</option>
                <option value="Machine">Machine</option>
                <option value="Cable">Cable</option>
                <option value="Bodyweight">Bodyweight</option>
              </select>
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            {initialData?.id && onDelete && (
              <button
                onClick={() => {
                  onDelete(initialData.id);
                  onClose();
                }}
                className="bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/30 active:scale-[0.98] transition-all font-black tracking-widest py-4 px-6 rounded-2xl flex-shrink-0 flex items-center justify-center"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-black tracking-widest py-4 rounded-2xl"
            >
              {initialData?.id ? 'SAVE CHANGES' : 'ADD EXERCISE'}
            </button>
          </div>
        </div>
      </div>

      <MuscleGroupSelectorModal 
        isOpen={activeMuscleSelector !== null}
        onClose={() => setActiveMuscleSelector(null)}
        selectedString={activeMuscleSelector === 'primary' ? pStr : sStr}
        onSave={(selectedStr: string) => {
          if (activeMuscleSelector === 'primary') {
            setFormState((prev: any) => ({ ...prev, muscleGroup: `${selectedStr} | ${sStr}` }));
          } else {
            setFormState((prev: any) => ({ ...prev, muscleGroup: `${pStr} | ${selectedStr}` }));
          }
        }}
      />
    </>
  );
};
