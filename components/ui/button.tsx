import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent-600)] text-[#211a24] hover:bg-[var(--accent-700)] focus-visible:ring-[var(--accent-300)] shadow-[0_10px_24px_-14px_rgba(214,106,150,0.68)]",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-soft)] hover:bg-[var(--surface-3)] focus-visible:ring-[var(--accent-200)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-200)]",
  dark:
    "bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[#413b48] focus-visible:ring-[#6f6778]",
  danger:
    "bg-[#b24d75] text-[#211a24] hover:bg-[#c55c85] focus-visible:ring-[#b67894]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3 text-sm",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-11 rounded-2xl px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
