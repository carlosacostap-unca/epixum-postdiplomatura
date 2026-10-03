import type { ReactNode } from "react";
import { Badge } from "@/components/ui";

interface CourseUnitProps {
  children: ReactNode;
  counts: string;
  headingLevel?: "h2" | "h3";
  id: string;
  metadata?: ReactNode;
  number: number;
  open?: boolean;
  title: string;
}

export function CourseUnit({ children, counts, headingLevel = "h3", id, metadata, number, open = false, title }: CourseUnitProps) {
  const Heading = headingLevel;
  return <details id={`unit-${id}`} open={open} className="unit-disclosure rounded-[var(--epixum-radius-xl)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
    <summary className="flex cursor-pointer items-start gap-3 rounded-[var(--epixum-radius-xl)] p-4 transition-colors hover:bg-[var(--color-surface-container)] sm:gap-4 sm:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info)]/10 font-headline text-lg font-bold text-[var(--color-info)]" aria-hidden="true">{String(number).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><Badge tone="info">Unidad {number}</Badge>{metadata}</div>
        <Heading className="mt-2 font-headline text-lg font-bold sm:text-xl">{title}</Heading>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] sm:text-sm">{counts}</p>
      </div>
      <span className="material-symbols-outlined unit-chevron mt-2 shrink-0 text-[var(--color-text-muted)] transition-transform" aria-hidden="true">expand_more</span>
    </summary>
    <div className="space-y-5 border-t border-[var(--color-outline-variant)] p-4 sm:p-5">{children}</div>
  </details>;
}
