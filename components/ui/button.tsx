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
    "bg-[var(--pink-bright)] text-[var(--pink-soft)] hover:bg-[var(--accent-800)] focus-visible:ring-[var(--accent-300)] shadow-[0_20px_34px_-18px_rgba(255,71,162,0.68)]",
  secondary:
    "bg-[var(--pink-soft)] text-[var(--text-on-light)] border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_44%)] hover:bg-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_24%)] hover:text-[var(--text-on-light-strong)] focus-visible:ring-[var(--accent-300)] shadow-[0_16px_30px_-24px_rgba(255,71,162,0.6)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-soft)_14%)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-300)]",
  dark:
    "bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_36%)] text-[var(--pink-soft)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_28%)] hover:bg-[color-mix(in_oklab,var(--surface-1),var(--pink-bright)_18%)] focus-visible:ring-[var(--accent-300)]",
  danger:
    "bg-[var(--accent-800)] text-[var(--pink-soft)] hover:bg-[color-mix(in_oklab,var(--accent-800),var(--pink-bright)_18%)] focus-visible:ring-[var(--accent-300)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 rounded-xl px-3.5 text-sm",
  md: "h-11 rounded-xl px-4.5 text-[0.98rem]",
  lg: "h-12 rounded-2xl px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
