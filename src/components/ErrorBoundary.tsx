import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isDetailsOpen: false };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error to the console
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in duration-500">
          <div className="h-24 w-24 rounded-full bg-rose-600/10 flex items-center justify-center border border-rose-600/20 shadow-[0_0_30px_rgba(225,29,72,0.15)]">
            <AlertTriangle className="h-10 w-10 text-rose-600" />
          </div>
          
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-3xl font-black tracking-tight text-white">Oops! Something went wrong.</h1>
            <p className="text-gray-400 font-medium">The application encountered an unexpected error and could not continue.</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <RefreshCw className="h-5 w-5" />
            <span>RELOAD APP</span>
          </button>

          <div className="w-full max-w-3xl mt-12">
            <button 
              onClick={() => this.setState({ isDetailsOpen: !this.state.isDetailsOpen })}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mx-auto mb-4 font-medium"
            >
              <Terminal className="h-4 w-4" />
              <span>{this.state.isDetailsOpen ? 'Hide Debug Info' : 'Show Debug Info'}</span>
            </button>
            
            {this.state.isDetailsOpen && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 text-left overflow-auto max-h-96 text-xs font-mono shadow-2xl">
                <div className="text-rose-500 font-bold mb-3 break-words text-sm pb-3 border-b border-[#222]">
                  {this.state.error && this.state.error.toString()}
                </div>
                <div className="text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
