import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 text-sm text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-300)] focus:ring-2 focus:ring-[var(--accent-100)]",
        className,
      )}
      {...props}
    />
  );
});
