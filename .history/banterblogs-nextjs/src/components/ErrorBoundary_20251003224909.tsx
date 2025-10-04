'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (_error: Error, _errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>; // Auto-reset when these keys change
  resetOnPropsChange?: boolean; // Auto-reset on any prop change
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (!hasError) return;

    // Auto-reset when resetKeys change
    if (resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    // Auto-reset on any prop change (useful for route changes)
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.reset();
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return <this.props.fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try again.
            </p>
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 rounded bg-muted p-4 text-xs text-left overflow-auto max-h-96">
                  <div className="font-semibold mb-2 text-destructive">Error:</div>
                  <div className="mb-4 text-destructive-foreground">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold mb-2">Stack Trace:</div>
                      <div className="mb-4 text-muted-foreground">
                        {this.state.error.stack}
                      </div>
                    </>
                  )}
                  
                  {this.state.errorInfo && (
                    <>
                      <div className="font-semibold mb-2">Component Stack:</div>
                      <div className="text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </div>
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error handler for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error; // Trigger nearest error boundary
    }
  }, [error]);

  return React.useCallback((err: Error) => {
    console.error('Error caught by useErrorHandler:', err);
    setError(err);
  }, []);
}

// Utility to wrap async functions with error handling
export function withErrorHandler<T extends (..._args: any[]) => Promise<any>>(
  fn: T,
  errorHandler: (_error: Error) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      errorHandler(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }) as T;
}

export default ErrorBoundary;