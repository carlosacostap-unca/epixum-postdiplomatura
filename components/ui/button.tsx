import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[var(--color-on-primary)] shadow-[var(--epixum-shadow-glow)] hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary-container)]",
  secondary:
    "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]",
  ghost:
    "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
  danger:
    "bg-[var(--color-error)] text-[var(--color-on-error)] hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
  icon: "size-11 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isPending?: boolean;
  pendingLabel?: string;
  leadingIcon?: ReactNode;
}

export function Button({
  children,
  className,
  disabled,
  isPending = false,
  leadingIcon,
  pendingLabel = "Procesando…",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--epixum-radius-pill)] font-bold tracking-wide transition-[background-color,color,filter,opacity,transform] duration-[var(--epixum-motion-base)] ease-[var(--epixum-ease-standard)] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      {...props}
    >
      {isPending ? (
        <span className="material-symbols-outlined animate-spin text-[1.15em]" aria-hidden="true">
          progress_activity
        </span>
      ) : (
        leadingIcon
      )}
      <span>{isPending ? pendingLabel : children}</span>
    </button>
  );
}

export interface IconButtonProps
  extends Omit<ButtonProps, "aria-label" | "children" | "leadingIcon" | "pendingLabel" | "size"> {
  label: string;
  icon: ReactNode;
}

export function IconButton({ icon, label, title, ...props }: IconButtonProps) {
  return (
    <Button
      size="icon"
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
