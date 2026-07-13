import { cn } from "../../lib/cn";
import { Tooltip } from "./Tooltip";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  danger?: boolean;
}

export function IconButton({ icon, label, danger, className, ...rest }: Props) {
  return (
    <Tooltip label={label}>
      <button aria-label={label} className={cn("icon-btn", danger && "danger", className)} {...rest}>
        {icon}
      </button>
    </Tooltip>
  );
}
