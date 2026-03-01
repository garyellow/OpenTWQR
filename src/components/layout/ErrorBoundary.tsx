import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Top-level error boundary that catches unhandled render/lifecycle errors
 * and shows a friendly recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for debugging; replace with a real error-tracking
    // service (e.g. Sentry) if needed in production.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <RefreshCw size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            發生錯誤
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-70 mx-auto leading-relaxed text-pretty">
            應用程式發生預期外的錯誤，請重新整理後再試。
          </p>
          {this.state.message && (
            <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto break-all">
              {this.state.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          重新整理
        </button>
      </div>
    );
  }
}
