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
        "rounded-[var(--radius-panel)] border border-[var(--border-soft)] bg-[var(--surface-2)] p-[var(--space-panel)] shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
