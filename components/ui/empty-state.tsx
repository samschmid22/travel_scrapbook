import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_34%)] bg-[color-mix(in_oklab,var(--pink-soft),white_34%)] px-7 py-11 text-center",
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-[0.98rem] text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
