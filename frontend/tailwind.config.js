/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CSS 변수 기반 → 다크/라이트 토글이 변수만 바꾸면 됨
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        elevated: "hsl(var(--elevated) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        "fg-muted": "hsl(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "hsl(var(--fg-subtle) / <alpha-value>)",
        // 포인트: 시안/틸 (흐르는 데이터/신호)
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        "accent-muted": "hsl(var(--accent-muted) / <alpha-value>)",
        // 상태 (절제)
        ok: "hsl(var(--ok) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        // 사이드바 (항상 어둡게)
        "sidebar": "hsl(var(--sidebar) / <alpha-value>)",
        "sidebar-fg": "hsl(var(--sidebar-fg) / <alpha-value>)",
        "sidebar-muted": "hsl(var(--sidebar-muted) / <alpha-value>)",
        "sidebar-active": "hsl(var(--sidebar-active) / <alpha-value>)",
        "sidebar-border": "hsl(var(--sidebar-border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "Pretendard", "-apple-system", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "'SF Mono'", "'SFMono-Regular'", "Menlo", "'Cascadia Mono'", "'Cascadia Code'", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 hsl(var(--shadow) / 0.04), 0 1px 3px 0 hsl(var(--shadow) / 0.06)",
        elevated: "0 4px 12px -2px hsl(var(--shadow) / 0.10), 0 2px 6px -2px hsl(var(--shadow) / 0.08)",
        glow: "0 0 0 1px hsl(var(--accent) / 0.3), 0 0 20px -4px hsl(var(--accent) / 0.35)",
      },
      keyframes: {
        flow: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        flow: "flow 2s linear infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
