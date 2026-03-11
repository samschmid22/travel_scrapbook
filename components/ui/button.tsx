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
    "bg-[var(--accent-600)] text-white hover:bg-[var(--accent-700)] focus-visible:ring-[var(--accent-300)] shadow-[0_8px_22px_-12px_var(--accent-700)]",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-soft)] hover:bg-[var(--surface-3)] focus-visible:ring-[var(--accent-200)]",
  ghost:
    "text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus-visible:ring-[var(--accent-200)]",
  dark:
    "bg-[var(--card-strong)] text-white hover:bg-[#2f2a33] focus-visible:ring-[#676077]",
  danger:
    "bg-[#a23653] text-white hover:bg-[#8d2945] focus-visible:ring-[#d9a0b3]",
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
