import { Toast } from './toast';
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

interface State {
  readonly failed: boolean;
}

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected render failure', {
      name: error.name,
      componentStack: info.componentStack,
    });
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="system-page">
          <Toast role="alert">
            <p className="eyebrow">Unexpected failure</p>
            <h1>Keelwatch could not render this view.</h1>
            <p>
              Reload the page. If the problem continues, note the time and try again
              later.
            </p>
            <button
              className="button button--primary"
              onClick={() => window.location.reload()}
            >
              Reload application
            </button>
          </Toast>
        </main>
      );
    }
    return this.props.children;
  }
}
