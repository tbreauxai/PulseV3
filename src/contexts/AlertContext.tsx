import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  alert: (message: string, title?: string) => Promise<boolean>;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const alert = useCallback((message: string, title: string = 'Alert') => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const confirm = useCallback((message: string, title: string = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}
      
      {/* Modal Overlay */}
      {state.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={state.type === 'confirm' ? state.onCancel : state.onConfirm} />
          
          <div className="relative w-full max-w-sm bg-[#111] border border-[#222] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-600/10 border border-rose-600/20">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{state.title}</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">{state.message}</p>
              </div>
            </div>
            
            <div className="flex border-t border-[#222] bg-[#0a0a0a]">
              {state.type === 'confirm' && (
                <button
                  onClick={state.onCancel}
                  className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors border-r border-[#222]"
                >
                  CANCEL
                </button>
              )}
              <button
                onClick={state.onConfirm}
                className={`flex-1 py-4 text-sm font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors ${state.type === 'alert' ? 'w-full' : ''}`}
              >
                {state.type === 'alert' ? 'OK' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
