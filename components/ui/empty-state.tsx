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
        "flex flex-col items-center rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] px-6 py-12 text-center md:px-10 md:py-16",
        className,
      )}
    >
      <span
        className="material-symbols-outlined mb-5 text-5xl text-[var(--color-on-surface-variant)]"
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
