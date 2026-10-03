import type { HTMLAttributes } from "react";
import { cx } from "./styles";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-[var(--epixum-radius-xl)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-2 px-5 pt-5 md:px-6 md:pt-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx("font-headline text-xl font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx("text-sm leading-relaxed text-[var(--color-on-surface-variant)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("min-w-0 px-5 py-5 md:px-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-wrap items-center gap-3 px-5 pb-5 md:px-6 md:pb-6", className)} {...props} />;
}
