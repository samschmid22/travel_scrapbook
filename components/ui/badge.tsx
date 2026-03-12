import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_24%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_18%)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
