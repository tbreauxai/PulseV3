import React, { useState } from 'react';
import { X, Activity } from 'lucide-react';
import { useAlert } from '../../../contexts/AlertContext';

const CARDIO_TYPES = [
  'Treadmill',
  'Stairclimber',
  'Elliptical',
  'Stationary Bike',
  'Rowing Machine',
  'Bodyweight / Outdoor'
];

export const CardioEntryModal = ({ isOpen, onClose, onSave }: any) => {
  const { alert } = useAlert();
  const [selectedType, setSelectedType] = useState(CARDIO_TYPES[0]);
  const [time, setTime] = useState('');
  const [calories, setCalories] = useState('');
  const [distance, setDistance] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!time) {
      alert("Please enter a time.");
      return;
    }
    
    onSave({
      type: selectedType,
      time,
      calories,
      distance
    });
    
    // Reset state
    setSelectedType(CARDIO_TYPES[0]);
    setTime('');
    setCalories('');
    setDistance('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300 rounded-t-3xl sm:rounded-b-3xl">
        <div className="p-6 pb-4 border-b border-[#222]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wider">LOG CARDIO</h3>
                <p className="text-xs text-gray-400 mt-1">Add a quick cardio session.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-2">CARDIO TYPE</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none"
            >
              {CARDIO_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-2">TIME (MIN)</label>
              <input
                type="number"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 30"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-700"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-2">CALORIES</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="e.g. 300"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-700"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-2">DISTANCE (MI) <span className="text-gray-700 font-medium ml-1">(Optional)</span></label>
            <input
              type="number"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 3.1"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-700"
            />
          </div>
        </div>

        <div className="p-4 border-t border-[#222] bg-[#111] rounded-b-3xl">
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-black tracking-widest py-4 rounded-2xl flex items-center justify-center space-x-2"
          >
            <span>SAVE CARDIO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
