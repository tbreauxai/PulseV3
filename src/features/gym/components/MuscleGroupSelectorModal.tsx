import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const muscleCategories = [
  { name: 'Chest', subMuscles: ['Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest', 'Inner Chest'] },
  { name: 'Back', subMuscles: ['Back', 'Lats', 'Upper Lats', 'Mid Back', 'Rear Delts', 'Traps', 'Upper Traps', 'Mid Traps', 'Lower Traps', 'Lower Back', 'Rhomboids', 'Levator Scapulae'] },
  { name: 'Legs', subMuscles: ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Gluteus Maximus', 'Gluteus Minimus', 'Gluteus Medius', 'Tensor Faciae Latae (Outer Hip)', 'Calves', 'Soleus (Underlying Calf Muscle)', 'Gastrocnemius (Outer Calf Muscle)', 'Adductors', 'Abductors'] },
  { name: 'Shoulders', subMuscles: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'] },
  { name: 'Arms', subMuscles: ['Arms', 'General Biceps', 'Biceps Brachii (Short Head Emphasis)', 'Biceps Brachii (Long Head Emphasis)', 'Triceps', 'Forearms', 'Forearm Flexors', 'Forearm Extensors', 'Grip Stabilizers', 'Brachialis', 'Brachioradialis'] },
  { name: 'Core', subMuscles: ['Core', 'Upper Abs', 'Lower Abs', 'Obliques', 'Transverse Abdominis', 'Hip Flexors'] },
  { name: 'Cardio', subMuscles: ['Cardio'] },
  { name: 'Full Body', subMuscles: ['Full Body'] },
];

export const groupMusclesByCategory = (muscles: string[]) => {
  const grouped: { category: string, muscles: string[] }[] = [];
  const uncategorized: string[] = [];

  const musclesSet = new Set(muscles);

  muscleCategories.forEach(category => {
    const found = category.subMuscles.filter(m => musclesSet.has(m)).sort();
    if (found.length > 0) {
      grouped.push({ category: category.name, muscles: found });
      found.forEach(m => musclesSet.delete(m));
    }
  });

  if (musclesSet.size > 0) {
    uncategorized.push(...Array.from(musclesSet).sort());
  }

  return { grouped, uncategorized };
};

export const MuscleGroupSelectorModal = ({ isOpen, onClose, selectedString, onSave }: any) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedString) {
        setSelected(selectedString.split(',').map((s: string) => s.trim()).filter((s: string) => Boolean(s) && s !== 'Restored'));
      } else {
        setSelected([]);
      }
    }
  }, [isOpen, selectedString]);

  if (!isOpen) return null;

  const toggleSelection = (muscle: string) => {
    setSelected(prev => 
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle) 
        : [...prev, muscle]
    );
  };

  const handleSave = () => {
    onSave(selected.join(', '));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
        
        <div className="p-6 pb-4 shrink-0 border-b border-[#222]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">MUSCLE GROUPS</h3>
              <p className="text-xs text-gray-400 mt-1">Select one or multiple targets.</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {muscleCategories.map((category) => {
            const isExpanded = expandedCategory === category.name;
            const selectedCount = category.subMuscles.filter(m => selected.includes(m)).length;
            
            return (
              <div key={category.name} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-[#111] hover:bg-[#161616] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-white">{category.name}</span>
                    {selectedCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-600/20 text-rose-500 rounded-full text-xs font-bold">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#1a1a1a]"
                    >
                      <div className="p-2">
                        {category.subMuscles.map(muscle => {
                          const isSelected = selected.includes(muscle);
                          return (
                            <button
                              key={muscle}
                              onClick={() => toggleSelection(muscle)}
                              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#1a1a1a] transition-colors"
                            >
                              <span className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-gray-400'}`}>
                                {muscle === category.name ? `General ${muscle}` : muscle}
                              </span>
                              <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-rose-600 border-rose-600' : 'border-gray-600 bg-transparent'}`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#222] shrink-0 bg-[#111]">
          <button
            onClick={handleSave}
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-black tracking-widest py-4 rounded-2xl flex items-center justify-center space-x-2"
          >
            <span>SAVE SELECTION</span>
            {selected.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold">
                {selected.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
