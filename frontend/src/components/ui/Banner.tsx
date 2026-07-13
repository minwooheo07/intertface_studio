import { cn } from "../../lib/cn";
import { Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warn" | "danger" | "ok";
const cfg: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "border-accent/30 bg-accent-muted/50 text-fg", Icon: Info },
  warn: { cls: "border-warn/30 bg-warn/10 text-fg", Icon: AlertTriangle },
  danger: { cls: "border-danger/30 bg-danger/10 text-fg", Icon: XCircle },
  ok: { cls: "border-ok/30 bg-ok/10 text-fg", Icon: CheckCircle2 },
};

export function Banner({ tone = "info", title, description, children }: {
  tone?: Tone; title: string; description?: string; children?: ReactNode;
}) {
  const { cls, Icon } = cfg[tone];
  const iconColor = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-accent";
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3", cls)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-fg-muted mt-0.5">{description}</p>}
        {children}
      </div>
    </div>
  );
}
