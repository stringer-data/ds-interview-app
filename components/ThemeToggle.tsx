"use client";

import { useState, useEffect } from "react";

const THEME_KEY = "ds-trainer-theme";

function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function setTheme(value: "light" | "dark") {
  document.documentElement.dataset.theme = value;
  window.localStorage.setItem(THEME_KEY, value);
}

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="btn btn-ghost"
        style={{ fontSize: "0.9rem" }}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost"
      style={{ padding: "0.4rem 0.6rem", fontSize: "1.1rem" }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
