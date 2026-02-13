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
    console.error("❌ ERROR BOUNDARY CAUGHT:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f8fafc",
        }}>
          <h1 style={{ color: "#e11d48", marginBottom: "1rem" }}>
            ⚠️ Something went wrong
          </h1>
          <p style={{ color: "#64748b", marginBottom: "2rem", maxWidth: "500px", textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
            }}>
            Go Home
          </button>
          <details style={{ marginTop: "2rem", color: "#64748b" }}>
            <summary style={{ cursor: "pointer" }}>See details</summary>
            <pre style={{ backgroundColor: "#f1f5f9", padding: "1rem", borderRadius: "6px" }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
