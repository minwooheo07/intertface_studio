import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";
import type { ReactNode } from "react";

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({ children, align = "end" }: { children: ReactNode; align?: "start" | "end" }) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={8}
        className="z-50 min-w-[180px] overflow-hidden rounded-[14px] border border-border bg-surface p-1.5 shadow-elevated animate-fade-in"
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({ children, onSelect, danger }: { children: ReactNode; onSelect?: () => void; danger?: boolean }) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium outline-none transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-fg hover:bg-muted"
      )}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export function DropdownMenuSeparator() {
  return <RadixDropdown.Separator className="my-1.5 h-px bg-border" />;
}
