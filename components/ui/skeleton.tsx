import type { HTMLAttributes } from "react";
import { cx } from "./styles";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "animate-pulse rounded-[var(--epixum-radius-sm)] bg-[var(--color-surface-container-highest)]",
        className,
      )}
      {...props}
    />
  );
}

export function LoadingState({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
