import { cn } from "../../lib/cn";

interface Props { src: string; tgt: string; live?: boolean; className?: string; }

export function Pipe({ src, tgt, live, className }: Props) {
  return (
    <span className={cn("pipe", className)}>
      <span className="pipe-node">{src || "?"}</span>
      <span className={cn("pipe-wire", live && "pipe-wire--live")} />
      <span className="pipe-node">{tgt || "?"}</span>
    </span>
  );
}
