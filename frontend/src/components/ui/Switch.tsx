import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "../../lib/cn";

export function Switch({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <RadixSwitch.Root
        checked={checked} onCheckedChange={onChange}
        className={cn(
          "relative mt-0.5 h-[26px] w-[42px] shrink-0 rounded-full transition-colors duration-200",
          "data-[state=checked]:bg-ok data-[state=unchecked]:bg-fg/15"
        )}
      >
        <RadixSwitch.Thumb className="block h-[22px] w-[22px] translate-x-0.5 rounded-full bg-white shadow-md transition-transform duration-200 data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
      {(label || hint) && (
        <span>
          {label && <span className="text-sm font-medium text-fg">{label}</span>}
          {hint && <span className="block text-xs text-fg-muted mt-0.5">{hint}</span>}
        </span>
      )}
    </label>
  );
}
