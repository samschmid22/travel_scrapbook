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
        "rounded-[1.65rem] border border-[var(--border-soft)] bg-[var(--surface-2)] p-6 shadow-[0_30px_62px_-42px_rgba(67,61,78,0.56)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
