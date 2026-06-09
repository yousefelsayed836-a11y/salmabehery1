"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(err: Error) {
    console.error("Page error caught by boundary:", err.message);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ color: "#555", fontSize: 15 }}>Something went wrong. Please refresh the page.</p>
        <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
          style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#fda1b7", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          Refresh
        </button>
      </div>
    );
    return this.props.children;
  }
}
