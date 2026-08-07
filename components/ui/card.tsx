import type { HTMLAttributes } from "react";
import { cx } from "./styles";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] shadow-[0_16px_44px_rgb(0_0_0/18%)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-2 px-6 pt-6 md:px-8 md:pt-8", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx("font-headline text-xl font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx("text-sm leading-relaxed text-[var(--color-on-surface-variant)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("px-6 py-6 md:px-8", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-wrap items-center gap-3 px-6 pb-6 md:px-8 md:pb-8", className)} {...props} />;
}
