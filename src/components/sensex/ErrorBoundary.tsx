import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log in dev only; would route to telemetry in production
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Chart ErrorBoundary caught:', error, info);
    }
    this.props.onError?.(error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="glass-card p-6 text-center">
            <p className="text-rose-400 text-sm mb-1">Something went wrong rendering this chart.</p>
            <p className="text-gray-500 text-xs">{this.state.error?.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
