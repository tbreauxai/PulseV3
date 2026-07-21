import React, { useState, useEffect } from 'react';
import { useBodyMetrics } from '../hooks/useBodyMetrics';
import { useWeighIns } from '../hooks/useWeighIns';
import { User, Activity, Flame, Ruler, Loader2, Save, Droplets, Dumbbell, Percent, Bone } from 'lucide-react';
import { useAlert } from '../../../contexts/AlertContext';

export const LifestyleMetrics = () => {
  const { metrics, saveMetrics, isLoading } = useBodyMetrics();
  const { logs } = useWeighIns();
  const { alert } = useAlert();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    height_cm: '',
    gender: 'male',
    activity_level: 'sedentary'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (metrics && !isLoading && !isEditing) {
      setFormData({
        age: metrics.age?.toString() || '',
        height_cm: metrics.height_cm?.toString() || '',
        gender: metrics.gender || 'male',
        activity_level: metrics.activity_level || 'sedentary'
      });
    }
  }, [metrics, isLoading, isEditing]);

  const latestWeightLbs = logs && logs.length > 0 ? parseFloat(logs[0].weight) : null;
  const latestWeightKg = latestWeightLbs ? latestWeightLbs * 0.453592 : null;

  const calculateMetrics = () => {
    if (!formData.age || !formData.height_cm || !latestWeightKg) return null;
    
    const age = parseInt(formData.age);
    const heightCm = parseFloat(formData.height_cm);
    
    // BMI = weight(kg) / height(m)^2
    const heightM = heightCm / 100;
    const bmi = latestWeightKg / (heightM * heightM);

    // BMR Mifflin-St Jeor
    let bmr = (10 * latestWeightKg) + (6.25 * heightCm) - (5 * age);
    bmr += formData.gender === 'male' ? 5 : -161;

    // TDEE
    const multipliers: Record<string, number> = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'extra': 1.9
    };
    const tdee = bmr * (multipliers[formData.activity_level] || 1.2);

    // Advanced Body Composition Estimation
    const genderFactor = formData.gender === 'male' ? 1 : 0;
    
    // Body Fat % (Deurenberg Formula)
    let bodyFatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
    if (bodyFatPercent < 2) bodyFatPercent = 2;
    if (bodyFatPercent > 60) bodyFatPercent = 60;

    // Lean Body Mass (LBM) in kg (Boer Formula)
    let lbmKg = 0;
    if (formData.gender === 'male') {
      lbmKg = (0.407 * latestWeightKg) + (0.267 * heightCm) - 19.2;
    } else {
      lbmKg = (0.252 * latestWeightKg) + (0.473 * heightCm) - 48.3;
    }
    const lbmLbs = lbmKg * 2.20462;

    // Body Water (typically ~73% of LBM)
    const bodyWaterPercent = ((lbmKg * 0.73) / latestWeightKg) * 100;

    // Bone Mass (typically ~4-5% of total weight)
    const boneMassLbs = latestWeightLbs * 0.04;

    // Muscle Mass (LBM - Bone Mass)
    const muscleMassLbs = lbmLbs - boneMassLbs;
    const muscleMassPercent = (muscleMassLbs / latestWeightLbs) * 100;

    return {
      bmi: bmi.toFixed(1),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      bodyFat: bodyFatPercent.toFixed(1),
      leanMass: lbmLbs.toFixed(1),
      bodyWater: bodyWaterPercent.toFixed(1),
      boneMass: boneMassLbs.toFixed(1),
      muscleMass: muscleMassLbs.toFixed(1),
      muscleMassPercent: muscleMassPercent.toFixed(1)
    };
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveMetrics({
        age: formData.age ? parseInt(formData.age) : null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        gender: formData.gender,
        activity_level: formData.activity_level
      });
      setIsEditing(false);
      alert('success', 'Body metrics updated');
    } catch (e) {
      console.error(e);
      alert('error', 'Failed to save metrics');
    } finally {
      setIsSaving(false);
    }
  };

  const calculated = calculateMetrics();

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-rose-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Body Metrics</h2>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded flex items-center gap-1"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : (isEditing ? <Save className="w-3 h-3" /> : 'EDIT')}
          {isEditing ? 'SAVE' : ''}
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 tracking-wider">AGE</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={e => setFormData(p => ({ ...p, age: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-800 rounded p-2 text-white font-bold"
                  placeholder="Years"
                />
              ) : (
                <div className="text-lg font-bold text-white">{formData.age || '--'}</div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 tracking-wider">HEIGHT (cm)</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.height_cm}
                  onChange={e => setFormData(p => ({ ...p, height_cm: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-800 rounded p-2 text-white font-bold"
                  placeholder="cm"
                />
              ) : (
                <div className="text-lg font-bold text-white">{formData.height_cm || '--'} cm</div>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 tracking-wider">GENDER</label>
              {isEditing ? (
                <select 
                  value={formData.gender}
                  onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-800 rounded p-2 text-white font-bold"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <div className="text-lg font-bold text-white capitalize">{formData.gender || '--'}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 tracking-wider">ACTIVITY</label>
              {isEditing ? (
                <select 
                  value={formData.activity_level}
                  onChange={e => setFormData(p => ({ ...p, activity_level: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-800 rounded p-2 text-white font-bold text-sm"
                >
                  <option value="sedentary">Sedentary (Office job)</option>
                  <option value="light">Light (1-3 days/wk)</option>
                  <option value="moderate">Moderate (3-5 days/wk)</option>
                  <option value="active">Active (6-7 days/wk)</option>
                  <option value="extra">Extra Active (Manual labor)</option>
                </select>
              ) : (
                <div className="text-lg font-bold text-white capitalize">{formData.activity_level || '--'}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-500 tracking-wider mt-8">CALCULATIONS</h3>
      {!latestWeightLbs ? (
        <div className="text-center p-4 text-sm text-gray-500 border border-gray-800 rounded-xl">
          Log a weigh-in first to see calculations!
        </div>
      ) : !calculated ? (
        <div className="text-center p-4 text-sm text-gray-500 border border-gray-800 rounded-xl">
          Enter your metrics above to see calculations!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4 text-blue-400" />
              <div className="text-[10px] text-blue-300/70 font-bold tracking-wider">BMI</div>
            </div>
            <div className="text-xl font-black text-blue-400">{calculated.bmi}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/10 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-purple-400" />
              <div className="text-[10px] text-purple-300/70 font-bold tracking-wider">BODY FAT</div>
            </div>
            <div className="text-xl font-black text-purple-400">{calculated.bodyFat}%</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <div className="text-[10px] text-emerald-300/70 font-bold tracking-wider">MUSCLE MASS</div>
            </div>
            <div className="text-xl font-black text-emerald-400">{calculated.muscleMass} <span className="text-xs font-normal text-emerald-400/50">lbs</span></div>
            <div className="text-[10px] text-emerald-400/50">{calculated.muscleMassPercent}%</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-indigo-400" />
              <div className="text-[10px] text-indigo-300/70 font-bold tracking-wider">LEAN MASS</div>
            </div>
            <div className="text-xl font-black text-indigo-400">{calculated.leanMass} <span className="text-xs font-normal text-indigo-400/50">lbs</span></div>
          </div>

          <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-900/10 border border-cyan-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <div className="text-[10px] text-cyan-300/70 font-bold tracking-wider">BODY WATER</div>
            </div>
            <div className="text-xl font-black text-cyan-400">{calculated.bodyWater}%</div>
          </div>

          <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/10 border border-gray-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Bone className="w-4 h-4 text-gray-400" />
              <div className="text-[10px] text-gray-300/70 font-bold tracking-wider">BONE MASS</div>
            </div>
            <div className="text-xl font-black text-gray-300">{calculated.boneMass} <span className="text-xs font-normal text-gray-400/50">lbs</span></div>
          </div>
          
          <div className="bg-gradient-to-br from-rose-900/40 to-rose-900/10 border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <div className="text-[10px] text-rose-300/70 font-bold tracking-wider">BASAL METABOLIC RATE (BMR)</div>
            </div>
            <div className="text-xl font-black text-rose-400">{calculated.bmr} <span className="text-xs font-normal text-rose-400/50">kcal/day</span></div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-orange-900/10 border border-orange-500/20 rounded-xl p-4 flex flex-col justify-between col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="text-[10px] text-orange-300/70 font-bold tracking-wider">TOTAL DAILY ENERGY (TDEE)</div>
            </div>
            <div className="text-xl font-black text-orange-400">{calculated.tdee} <span className="text-xs font-normal text-orange-400/50">kcal/day</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
