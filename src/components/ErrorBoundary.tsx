import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Vortex Panel render error:", error, info.componentStack);
  }

  handleReset = () => {
    try {
      localStorage.removeItem("vortex_containers_data_v3");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#07070a] text-gray-200 font-sans p-6">
          <div className="max-w-md rounded-2xl border border-rose-500/20 bg-[#0e0e13]/90 p-8 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-400 text-xl font-black">!</span>
            </div>
            <h1 className="text-lg font-black uppercase tracking-widest text-white">Panel Error</h1>
            <p className="text-xs text-gray-400 leading-relaxed font-mono break-words">{this.state.message}</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              The interface hit an unexpected state. Resetting the local workspace data usually resolves this.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Reload Panel
              </button>
              <button
                onClick={this.handleReset}
                className="rounded-lg border border-rose-500/30 px-4 py-2 text-xs font-black uppercase text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                Reset Workspace Data
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
