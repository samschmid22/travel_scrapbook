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
        "rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[0_28px_56px_-34px_rgba(11,7,16,0.78)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
