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
    "bg-[var(--accent-700)] text-[var(--text-on-light)] hover:bg-[var(--accent-800)] focus-visible:ring-[var(--accent-400)] shadow-[0_18px_30px_-18px_rgba(244,168,199,0.82)]",
  secondary:
    "bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_12%)] text-[var(--text-primary)] border border-[var(--border-soft)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--accent-200)_24%)] focus-visible:ring-[var(--accent-300)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-300)]",
  dark:
    "bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)] focus-visible:ring-[var(--accent-300)]",
  danger:
    "bg-[#d96c9f] text-[var(--text-on-light)] hover:bg-[#e07eab] focus-visible:ring-[#eaa1c2]",
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
