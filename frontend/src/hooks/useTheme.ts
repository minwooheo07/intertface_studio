import { useEffect, useState } from "react";

type Mode = "light" | "dark";

// localStorage는 아티팩트 환경 제약이 있으나 실제 배포에선 정상. 안전하게 try/catch.
function initial(): Mode {
  try {
    const saved = localStorage.getItem("if-studio-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    try { localStorage.setItem("if-studio-theme", mode); } catch { /* ignore */ }
  }, [mode]);

  return { mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) };
}
