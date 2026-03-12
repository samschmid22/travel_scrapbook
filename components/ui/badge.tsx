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
        "inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_34%)] bg-[color-mix(in_oklab,var(--surface-3),var(--accent-100)_20%)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
