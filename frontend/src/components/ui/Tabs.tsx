import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../../lib/cn";
import type { ReactNode } from "react";

interface TabDef { value: string; label: string; hasError?: boolean; }

export function Tabs({ value, onValue, tabs, children }: {
  value: string; onValue: (v: string) => void; tabs: TabDef[]; children: ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValue}>
      {/* iOS 세그먼트 컨트롤 느낌: 캡슐 배경 + 활성 pill */}
      <RadixTabs.List className="mb-6 inline-flex gap-1 rounded-[14px] bg-fg/[0.05] p-1">
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value} value={t.value}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-[10px] px-4 py-1.5 text-sm font-medium text-fg-muted transition-all",
              "hover:text-fg data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm"
            )}
          >
            {t.label}
            {t.hasError && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
