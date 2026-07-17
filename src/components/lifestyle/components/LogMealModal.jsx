import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LogMealModal = ({ isOpen, onClose, onLogMeal }) => {
  const [mealInput, setMealInput] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  const handleLog = () => {
    onLogMeal(mealInput);
    setMealInput({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    onClose();
  };

  const handleClose = () => {
    setMealInput({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-sm p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Log Meal</h3>
              <button onClick={handleClose} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              {[
                { label: 'Calories', key: 'calories', placeholder: 'kcal' },
                { label: 'Protein', key: 'protein', placeholder: 'g' },
                { label: 'Carbs', key: 'carbs', placeholder: 'g' },
                { label: 'Fats', key: 'fats', placeholder: 'g' }
              ].map(item => (
                <div key={item.key} className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 tracking-wider mb-1.5">{item.label}</label>
                  <input 
                    type="number" 
                    value={mealInput[item.key] || ''}
                    onChange={e => setMealInput({...mealInput, [item.key]: e.target.value})}
                    placeholder={item.placeholder}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleLog}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              ADD TO DAILY TOTAL
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
