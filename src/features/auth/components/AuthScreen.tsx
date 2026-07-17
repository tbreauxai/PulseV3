import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Sometimes signup requires email confirmation, let's inform the user just in case
        setErrorMsg('Success! If you do not automatically log in, check your email for a confirmation link.');
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 selection:bg-rose-600/30">
      <div className="w-full max-w-md mx-auto relative">
        
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#1a1a1a] rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2">
              PULSE<span className="text-rose-600">V3</span>
            </h1>
            <p className="text-sm font-bold text-gray-500 tracking-wider">
              {isLogin ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 tracking-widest pl-1">EMAIL</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-600 group-focus-within:text-rose-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-12 pr-4 text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 tracking-widest pl-1">PASSWORD</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-600 group-focus-within:text-rose-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-12 pr-4 text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className={`p-3 rounded-lg text-sm font-medium ${errorMsg.startsWith('Success') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] mt-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'SIGN IN' : 'SIGN UP'}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-sm font-medium text-gray-500 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
