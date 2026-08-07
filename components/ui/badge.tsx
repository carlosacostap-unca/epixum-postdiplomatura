import type { HTMLAttributes } from "react";
import { cx } from "./styles";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]",
  success: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]",
  error: "bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] text-[var(--color-error)]",
  info: "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center rounded-[var(--epixum-radius-pill)] px-3 py-1 text-xs font-bold leading-none tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
