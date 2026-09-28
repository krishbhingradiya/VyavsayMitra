import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VYAVSAYMITRA] ErrorBoundary caught error:', error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            minHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            margin: '1.5rem auto',
            maxWidth: '480px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))',
            textAlign: 'center',
            border: '1px solid var(--color-border, #e5e7eb)'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#DC2626'
            }}
          >
            <AlertTriangle size={24} />
          </div>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-text, #111827)',
              marginBottom: '0.5rem'
            }}
          >
            Something went wrong.
          </h2>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-muted, #6B7280)',
              marginBottom: '1.5rem',
              lineHeight: 1.5
            }}
          >
            An unexpected error occurred while loading this section. Please try again.
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="btn btn--green"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
