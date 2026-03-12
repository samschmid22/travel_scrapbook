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
        "rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_56%)] bg-[linear-gradient(150deg,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_14%)_100%)] px-7 py-11 text-center",
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-[var(--text-on-light)]">{title}</h3>
      <p className="mt-2 text-[0.98rem] text-[var(--text-on-light-strong)]">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
