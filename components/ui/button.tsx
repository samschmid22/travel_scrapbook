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
    "border border-[color-mix(in_oklab,var(--pink-dark),var(--pink-soft)_26%)] bg-[var(--pink-bright)] text-[var(--pink-soft)] hover:bg-[var(--accent-800)] focus-visible:ring-[var(--accent-300)] shadow-[0_20px_34px_-18px_rgba(255,71,162,0.68)]",
  secondary:
    "border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_44%)] bg-[var(--pink-soft)] text-[var(--text-on-light)] hover:bg-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_24%)] hover:text-[var(--text-on-light-strong)] focus-visible:ring-[var(--accent-300)] shadow-[0_16px_30px_-24px_rgba(255,71,162,0.6)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-soft)_14%)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-300)]",
  dark:
    "border border-[color-mix(in_oklab,var(--pink-dark),var(--pink-soft)_26%)] bg-[var(--pink-dark)] text-[var(--pink-soft)] hover:bg-[color-mix(in_oklab,var(--pink-dark),var(--pink-bright)_22%)] focus-visible:ring-[var(--accent-300)]",
  danger:
    "border border-[color-mix(in_oklab,var(--accent-800),var(--pink-soft)_30%)] bg-[var(--accent-800)] text-[var(--pink-soft)] hover:bg-[color-mix(in_oklab,var(--accent-800),var(--pink-bright)_18%)] focus-visible:ring-[var(--accent-300)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[var(--radius-control)] px-3 text-[0.84rem] sm:h-10 sm:px-3.5 sm:text-[0.92rem]",
  md: "h-10 rounded-[var(--radius-control)] px-3.5 text-[0.9rem] sm:h-11 sm:px-4.5 sm:text-[0.98rem]",
  lg: "h-11 rounded-[calc(var(--radius-control)+0.2rem)] px-4.5 text-[0.95rem] sm:h-12 sm:px-6 sm:text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
