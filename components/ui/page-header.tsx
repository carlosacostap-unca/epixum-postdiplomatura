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
    <header className={cx("flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between", className)}>
      <div className="min-w-0 max-w-4xl">
        {eyebrow || metadata ? <div className="mb-3 flex flex-wrap items-center gap-3">{eyebrow && <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{eyebrow}</span>}{metadata}</div> : null}
        <h1 className="font-headline text-[clamp(1.5rem,2.8vw,2.5rem)] font-bold leading-tight tracking-tight text-[var(--color-on-surface)]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-on-surface-variant)] md:text-base">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex max-w-full flex-wrap items-center gap-3 xl:shrink-0">{actions}</div> : null}
    </header>
  );
}
