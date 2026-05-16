import React from 'react';
import { StatePanel } from './StatePanel';

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center px-4">
          <div className="w-full max-w-md text-center space-y-4">
            <StatePanel
              title="Co loi xay ra"
              description="Da xay ra loi khong mong muon. Vui long thu lai."
            />
            <button
              onClick={this.handleRetry}
              className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90 transition-colors"
            >
              Thu lai
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
