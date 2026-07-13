import { cn } from "../../lib/cn";
import type { ReactNode } from "react";
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card", className)}>{children}</div>;
}
