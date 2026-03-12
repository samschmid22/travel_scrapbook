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
        "rounded-[var(--radius-panel)] border border-dashed border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_56%)] bg-[linear-gradient(150deg,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_14%)_100%)] px-7 py-9 text-center",
        className,
      )}
    >
      <h3 className="ds-card-title text-[var(--text-on-light)]">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-[var(--text-on-light-strong)]">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
