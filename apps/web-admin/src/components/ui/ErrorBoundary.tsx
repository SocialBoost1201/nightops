'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
          <div className="w-14 h-14 bg-red-900/20 border border-red-800/40 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-100 mb-2">表示エラーが発生しました</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            {this.state.error?.message ?? 'システムエラーが発生しました。ページを更新してください。'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#222] border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-[#2A2A2A] transition-colors"
          >
            <RefreshCw size={15} />
            ページを更新
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
