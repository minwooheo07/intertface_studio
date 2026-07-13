import { cn } from "../../lib/cn";
export function CodeBox({ code, className }: { code: string; className?: string }) {
  return (
    <pre className={cn("overflow-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed text-fg-muted", className)}>
      {code}
    </pre>
  );
}
