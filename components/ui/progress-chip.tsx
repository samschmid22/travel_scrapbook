import { cn } from "@/lib/utils";

export function ProgressChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("ds-progress-chip", className)}>{children}</span>;
}
