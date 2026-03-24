"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "btdt-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"pink" | "blue">("pink");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as "pink" | "blue" | null;
    if (saved) apply(saved);
  }, []);

  function apply(t: "pink" | "blue") {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t === "blue" ? "blue" : "");
    localStorage.setItem(STORAGE_KEY, t);
  }

  const isBlue = theme === "blue";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          userSelect: "none",
        }}
      >
        Pink
      </span>

      <button
        onClick={() => apply(isBlue ? "pink" : "blue")}
        title={`Switch to ${isBlue ? "pink" : "blue"} mode`}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          width: "3.25rem",
          height: "1.75rem",
          borderRadius: "999px",
          border: "1px solid var(--border-soft)",
          background: "color-mix(in oklab, var(--surface-2), var(--pink-bright) 12%)",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          transition: "background 300ms ease",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: isBlue ? "calc(100% - 1.45rem)" : "0.18rem",
            transform: "translateY(-50%)",
            width: "1.35rem",
            height: "1.35rem",
            borderRadius: "50%",
            background: "var(--pink-bright)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.72rem",
            lineHeight: 1,
            transition: "left 300ms ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
          }}
        >
          ✈️
        </span>
      </button>

      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          userSelect: "none",
        }}
      >
        Blue
      </span>
    </div>
  );
}
