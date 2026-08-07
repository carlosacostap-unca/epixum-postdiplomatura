import Link from "next/link";
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  href?: string;
  label: ReactNode;
}

export function Breadcrumbs({ items, label = "Migas de pan" }: { items: BreadcrumbItem[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${index}-${String(item.href ?? item.label)}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !isCurrent ? (
                <Link href={item.href} className="rounded-md hover:text-[var(--color-primary)]">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-[var(--color-on-surface)]" aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
