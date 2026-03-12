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
        "inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_48%)] bg-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_18%)] px-3 py-1 text-sm font-semibold text-[var(--text-on-light)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
