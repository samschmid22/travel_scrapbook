import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--accent-100)_10%)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-300)] focus:ring-2 focus:ring-[var(--accent-100)]/70",
          className,
        )}
        {...props}
      />
    );
  },
);
