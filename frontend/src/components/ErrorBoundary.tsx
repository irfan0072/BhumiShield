import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BhumiShield Application Error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('bs_user');
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_role');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#006A4E] flex items-center justify-center mx-auto mb-4 text-2xl font-black ring-4 ring-emerald-50">
              ভূ
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              ভূমি সুরক্ষা (BhumiShield)
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              সেশন অথবা ক্যাশ সম্পর্কিত কারণে পৃষ্ঠাটি পুনরায় লোড করা প্রয়োজন। নিচের বাটনে ক্লিক করুন।
            </p>
            {this.state.error && (
              <div className="text-left bg-slate-100 p-3 rounded-lg text-[11px] font-mono text-rose-700 overflow-x-auto mb-4 max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-xs transition"
              >
                রিলোড করুন (Reload)
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer transition"
              >
                সেশন রিসেট (Reset)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
