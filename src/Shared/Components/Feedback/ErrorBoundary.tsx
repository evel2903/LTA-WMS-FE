import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-level error boundary. Catches render-time crashes so the whole SPA does
 * not white-screen. Route-level boundaries can be added per module as needed.
 */
export class ErrorBoundary extends Component<
  PropsWithChildren<{ fallback?: ReactNode }>,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
    // TODO: forward to Sentry / observability sink.
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">{this.state.error?.message}</p>
          <button
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
            onClick={() => window.location.reload()}
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
