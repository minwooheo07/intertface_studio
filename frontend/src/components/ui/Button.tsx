import { cn } from "../../lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  default: "btn-neutral", primary: "btn-primary", danger: "btn-danger", ghost: "btn-ghost",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
  children: ReactNode;
}

export function Button({ variant = "default", size = "md", className, children, ...rest }: Props) {
  return (
    <button
      className={cn("btn", variants[variant], size === "sm" && "btn-sm", size === "icon" && "btn-icon", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
