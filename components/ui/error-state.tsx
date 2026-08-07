import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./styles";

export interface ErrorStateProps {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  title?: ReactNode;
}

export function ErrorState({
  action,
  className,
  description = "No pudimos cargar esta información. Revisá tu conexión e intentá nuevamente.",
  onRetry,
  retryLabel = "Reintentar",
  title = "Algo salió mal",
}: ErrorStateProps) {
  return (
    <section
      className={cx(
        "flex flex-col items-center rounded-[var(--epixum-radius-xl)] bg-[var(--color-error)]/8 px-6 py-12 text-center md:px-10 md:py-16",
        className,
      )}
      role="alert"
    >
      <span className="material-symbols-outlined mb-5 text-5xl text-[var(--color-error)]" aria-hidden="true">
        error
      </span>
      <h2 className="font-headline text-xl font-bold text-[var(--color-on-surface)] md:text-2xl">{title}</h2>
      <div className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-on-surface-variant)] md:text-base">
        {description}
      </div>
      {onRetry || action ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
          {action}
        </div>
      ) : null}
    </section>
  );
}
