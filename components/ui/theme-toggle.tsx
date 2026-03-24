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

  const isPink = theme === "pink";

  return (
    <button
      onClick={() => apply(isPink ? "blue" : "pink")}
      title={`Switch to ${isPink ? "blue" : "pink"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        borderRadius: "999px",
        border: "1px solid var(--border-soft)",
        background: "color-mix(in oklab, var(--surface-2), var(--pink-bright) 10%)",
        padding: "0.32rem 0.75rem 0.32rem 0.55rem",
        fontSize: "0.78rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: "var(--text-primary)",
        cursor: "pointer",
        transition: "all 220ms ease",
      }}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1 }}>{isPink ? "🩷" : "🩵"}</span>
      {isPink ? "Pink" : "Blue"}
    </button>
  );
}
