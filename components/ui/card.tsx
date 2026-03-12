import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[1.65rem] border border-[var(--border-soft)] bg-[var(--surface-2)] p-6 shadow-[0_26px_54px_-36px_rgba(87,77,85,0.42)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
