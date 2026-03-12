import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "progress" | "muted";

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  const variantClass =
    variant === "progress"
      ? "ds-progress-chip"
      : variant === "muted"
        ? "border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)] text-[var(--text-secondary)]"
        : "border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_48%)] bg-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_18%)] text-[var(--text-on-light)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-[0.01em]",
        variantClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
