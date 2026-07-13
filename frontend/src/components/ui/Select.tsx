import { cn } from "../../lib/cn";
import { ChevronDown } from "lucide-react";
import { FieldShell } from "./Input";

interface Props {
  label?: string; hint?: string; error?: string;
  value: string; options: { value: string; label: string }[] | string[];
  onValue: (v: string) => void; className?: string;
}
export function Select({ label, hint, error, value, options, onValue, className }: Props) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          className={cn("input appearance-none pr-9", error && "input-invalid", className)}
          value={value} onChange={(e) => onValue(e.target.value)}
        >
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
      </div>
    </FieldShell>
  );
}
