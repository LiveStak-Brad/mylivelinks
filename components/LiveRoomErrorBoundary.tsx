'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class LiveRoomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('LiveRoom Error:', error, errorInfo);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Live Room Error
            </h1>
            <p className="text-gray-300 mb-6">
              {this.state.error?.message || 'Something went wrong loading the live room.'}
            </p>
            <div className="bg-gray-900 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-400 mb-2">Technical Details:</p>
              <pre className="text-xs text-red-400 overflow-auto">
                {this.state.error?.stack}
              </pre>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
              >
                Go to Homepage
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              If this keeps happening, please contact support with the error details above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

