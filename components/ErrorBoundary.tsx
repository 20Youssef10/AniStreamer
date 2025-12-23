import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  // Initialize state as a class property to satisfy TypeScript
  public state: State = {
    hasError: false
  };

  // Explicitly define props to fix 'Property props does not exist' TS error
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Oops!</h1>
            <p className="text-slate-300 text-lg mb-8">Something went wrong. We're sorry.</p>
            <p className="text-slate-500 text-sm max-w-md bg-dark-800 p-4 rounded mb-8 font-mono">
                {this.state.error?.message}
            </p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary rounded-xl font-bold hover:bg-blue-600 transition-colors"
            >
                Reload Application
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;