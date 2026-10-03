import type { ReactNode } from "react";
import { cx } from "./styles";

export interface EmptyStateProps {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  icon?: string;
  title: ReactNode;
}

export function EmptyState({ action, className, description, icon = "inbox", title }: EmptyStateProps) {
  return (
    <section
      className={cx(
        "flex min-w-0 flex-col items-center rounded-[var(--epixum-radius-xl)] border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-5 py-8 text-center md:px-8 md:py-10",
        className,
      )}
    >
      <span
        className="material-symbols-outlined mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--color-surface-container)] text-2xl text-[var(--color-text-muted)]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="font-headline text-xl font-bold text-[var(--color-on-surface)] md:text-2xl">{title}</h2>
      <div className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-on-surface-variant)] md:text-base">
        {description}
      </div>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
