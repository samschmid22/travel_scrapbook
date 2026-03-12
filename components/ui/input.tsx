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
        "h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--pink-soft)_58%)] px-4 text-[0.98rem] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--pink-bright)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--pink-bright),white_72%)]",
        className,
      )}
      {...props}
    />
  );
});
