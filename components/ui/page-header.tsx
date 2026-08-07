import type { ReactNode } from "react";
import { cx } from "./styles";

export interface PageHeaderProps {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  title: ReactNode;
}

export function PageHeader({ actions, className, description, eyebrow, metadata, title }: PageHeaderProps) {
  return (
    <header className={cx("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 max-w-4xl">
        {eyebrow ? (
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">{eyebrow}</div>
        ) : null}
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--color-on-surface)] md:text-5xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-3 text-base leading-relaxed text-[var(--color-on-surface-variant)] md:text-lg">{description}</div>
        ) : null}
        {metadata ? <div className="mt-4 flex flex-wrap items-center gap-3">{metadata}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
