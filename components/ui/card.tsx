import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[0_16px_40px_-30px_rgba(42,31,43,0.48)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
