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
        "rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[0_20px_44px_-30px_rgba(7,6,10,0.78)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
