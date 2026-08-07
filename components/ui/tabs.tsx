import Link from "next/link";
import { cx } from "./styles";

export interface TabItem {
  href: string;
  icon?: string;
  isActive?: boolean;
  label: string;
}

export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="max-w-full overflow-x-auto pb-1">
      <ul className="flex min-w-max items-center gap-1 rounded-[var(--epixum-radius-pill)] bg-[var(--color-surface-container-low)] p-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-2 rounded-[var(--epixum-radius-pill)] px-4 py-2 text-sm font-bold transition-colors",
                item.isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
              )}
            >
              {item.icon ? <span className="material-symbols-outlined text-lg" aria-hidden="true">{item.icon}</span> : null}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
