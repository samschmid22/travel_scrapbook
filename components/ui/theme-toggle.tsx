"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "btdt-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"pink" | "blue">(() => {
    if (typeof window === "undefined") return "pink";
    return document.documentElement.getAttribute("data-theme") === "blue" ? "blue" : "pink";
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as "pink" | "blue" | null;
    if (saved) setTheme(saved);
  }, []);

  function apply(t: "pink" | "blue") {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t === "blue" ? "blue" : "");
    localStorage.setItem(STORAGE_KEY, t);
  }

  const isBlue = theme === "blue";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <span
        style={{
          fontSize: "0.92rem",
          fontWeight: 700,
          color: "var(--text-primary)",
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
          width: "3.6rem",
          height: "2.2rem",
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
            left: isBlue ? "calc(100% - 1.95rem)" : "0.22rem",
            transform: "translateY(-50%)",
            width: "1.7rem",
            height: "1.7rem",
            borderRadius: "50%",
            background: isBlue ? "#4794ff" : "var(--pink-bright)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            transition: "left 300ms ease, background 300ms ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
          }}
        >
          <span style={{ filter: "brightness(0) invert(1)", fontSize: "0.95rem" }}>✈️</span>
        </span>
      </button>

      <span
        style={{
          fontSize: "0.92rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          userSelect: "none",
        }}
      >
        Blue
      </span>
    </div>
  );
}
