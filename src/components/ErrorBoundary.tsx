/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '/';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-red-500/15 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">មានកំហុសបច្ចេកទេសប្រព័ន្ធ!</h1>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                មានបញ្ហាមិនប្រក្រតីមួយបានកើតឡើងក្នុងកម្មវិធី។ សូមព្យាយាមឡើងវិញ ឬត្រឡប់ទៅកាន់ទំព័រដើម។
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 text-left font-mono text-[10px] text-red-400 overflow-x-auto max-h-40 whitespace-pre">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-red-500 to-indigo-600 hover:from-red-400 hover:to-indigo-500 text-white font-black py-3.5 rounded-xl transition duration-150 flex items-center justify-center space-x-2 cursor-pointer text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ព្យាយាមឡើងវិញលម្អិត</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
