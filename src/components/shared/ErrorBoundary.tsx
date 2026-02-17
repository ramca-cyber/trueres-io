import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container max-w-4xl py-12">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
            <h2 className="text-lg font-heading font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {this.props.fallbackMessage || 'An error occurred while processing your file. The file may be corrupted or in an unsupported format.'}
            </p>
            {this.state.error && (
              <pre className="text-xs text-muted-foreground bg-secondary rounded p-3 max-w-md mx-auto overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="outline" onClick={this.handleReset}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
