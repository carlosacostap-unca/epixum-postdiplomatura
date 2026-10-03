import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./styles";

export interface StatCardProps {
  className?: string;
  description?: ReactNode;
  href?: string;
  icon?: string;
  label: ReactNode;
  tone?: "neutral" | "primary" | "warning" | "error" | "info";
  value: ReactNode;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-[var(--color-on-surface)]",
  primary: "text-[var(--color-primary)]",
  warning: "text-[var(--color-warning)]",
  error: "text-[var(--color-error)]",
  info: "text-[var(--color-info)]",
};

export function StatCard({ className, description, href, icon, label, tone = "neutral", value }: StatCardProps) {
  const content = (
    <div
      className={cx(
        "flex h-full min-w-0 items-start justify-between gap-3 rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5 transition-colors",
        href && "hover:bg-[var(--color-surface-container)]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">{label}</p>
        <div className={cx("mt-2 font-headline text-3xl font-bold tracking-tight", toneClasses[tone])}>{value}</div>
        {description ? <div className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{description}</div> : null}
      </div>
      {icon ? (
        <span className={cx("material-symbols-outlined flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container)] text-xl", toneClasses[tone])} aria-hidden="true">{icon}</span>
      ) : null}
    </div>
  );

  return href ? <Link href={href} className="block h-full rounded-[var(--epixum-radius-xl)]">{content}</Link> : content;
}
