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
        "flex h-full items-start justify-between gap-5 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6 transition-colors md:p-7",
        href && "hover:bg-[var(--color-surface-container)]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">{label}</p>
        <div className={cx("mt-3 font-headline text-4xl font-bold tracking-tight", toneClasses[tone])}>{value}</div>
        {description ? <div className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{description}</div> : null}
      </div>
      {icon ? (
        <span className={cx("material-symbols-outlined text-3xl", toneClasses[tone])} aria-hidden="true">{icon}</span>
      ) : null}
    </div>
  );

  return href ? <Link href={href} className="block h-full rounded-[var(--epixum-radius-xl)]">{content}</Link> : content;
}
