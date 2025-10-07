import React from 'react';

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console and possibly send to telemetry
    console.error('Uncaught UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">The application encountered an unexpected error. You can try reloading or contact support.</p>
          <pre className="mt-4 text-xs whitespace-pre-wrap">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
