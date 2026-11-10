"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "#f6f5f0" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: 460, textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                display: "grid",
                placeItems: "center",
                borderRadius: 16,
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
              }}
            >
              <AlertTriangle size={32} />
            </div>
            <h1 style={{ marginTop: 24, fontSize: 22, color: "#0b1f42" }}>Application error</h1>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
              The application could not start this page. Please reload. If the problem continues,
              contact the administrator with the code below.
            </p>
            {error.digest ? (
              <p
                style={{
                  marginTop: 12,
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "#e2e8f0",
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#475569",
                }}
              >
                Error code: {error.digest}
              </p>
            ) : null}
            <div style={{ marginTop: 28 }}>
              <button
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: 0,
                  background: "#0b1f42",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={16} /> Reload
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
