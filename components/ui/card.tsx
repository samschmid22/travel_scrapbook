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
        "rounded-[var(--radius-panel)] border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-panel)] sm:p-[var(--space-panel)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
