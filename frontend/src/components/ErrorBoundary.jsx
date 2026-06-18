import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={36} />
            <h2 className="text-lg font-bold text-red-700 mb-1">Something went wrong</h2>
            <p className="text-sm text-red-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <RefreshCw size={16} /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
