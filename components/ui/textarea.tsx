import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-300)] focus:ring-2 focus:ring-[var(--accent-100)]",
          className,
        )}
        {...props}
      />
    );
  },
);
