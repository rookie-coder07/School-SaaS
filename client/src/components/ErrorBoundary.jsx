import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("ERROR_BOUNDARY_CAUGHT:", error);
      console.error("ERROR_BOUNDARY_INFO:", errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#f8fafc",
            padding: "24px",
          }}
        >
          <h1 style={{ color: "#e11d48", marginBottom: "1rem" }}>Something went wrong</h1>
          <p
            style={{
              color: "#64748b",
              marginBottom: "2rem",
              maxWidth: "560px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Reload
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Go Home
            </button>
          </div>
          {isDev ? (
            <details style={{ marginTop: "2rem", color: "#64748b" }}>
              <summary style={{ cursor: "pointer" }}>See details</summary>
              <pre
                style={{
                  backgroundColor: "#f1f5f9",
                  padding: "1rem",
                  borderRadius: "6px",
                  maxWidth: "80vw",
                  overflow: "auto",
                }}
              >
                {this.state.error?.stack}
              </pre>
            </details>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

