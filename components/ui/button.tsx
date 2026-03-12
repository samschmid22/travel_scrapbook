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
    "bg-[var(--pink-bright)] text-[var(--text-on-light)] hover:bg-[var(--accent-800)] focus-visible:ring-[var(--accent-300)] shadow-[0_20px_34px_-18px_rgba(255,71,162,0.62)]",
  secondary:
    "bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_24%)] text-[var(--text-primary)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)] focus-visible:ring-[var(--accent-300)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-300)]",
  dark:
    "bg-[var(--pink-dark)] text-white hover:bg-[color-mix(in_oklab,var(--pink-dark),black_10%)] focus-visible:ring-[var(--accent-300)]",
  danger:
    "bg-[var(--accent-800)] text-white hover:bg-[color-mix(in_oklab,var(--accent-800),black_8%)] focus-visible:ring-[var(--accent-300)]",
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
