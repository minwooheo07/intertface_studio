import { cn } from "../../lib/cn";
import type { ReactNode } from "react";

type Tone = "ok" | "danger" | "muted" | "accent";
const map: Record<Tone, string> = {
  ok: "badge-ok", danger: "badge-danger", muted: "badge-muted", accent: "badge-accent",
};

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("badge", map[tone], className)}>{children}</span>;
}
