// Light or dark. Follows the system until the viewer picks one with the
// toggle; the pick is remembered in this browser. index.html sets the first
// value before paint, so there's no flash of the wrong theme.
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "yapifier-theme";
const BG: Record<Theme, string> = { light: "#ffffeb", dark: "#012b26" };
const system = (): Theme => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => saved() ?? system());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", BG[theme]));
  }, [theme]);

  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => !saved() && setTheme(system());
    m.addEventListener("change", follow);
    return () => m.removeEventListener("change", follow);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the toggle still works for this visit.
    }
    setTheme(next);
  };
  return [theme, toggle];
}
