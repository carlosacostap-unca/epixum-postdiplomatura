import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { cx } from "./styles";

export interface DataColumn<T> {
  className?: string;
  header: ReactNode;
  id: string;
  mobileLabel?: ReactNode;
  render: (item: T) => ReactNode;
}

export interface DataTableProps<T> {
  ariaLabel: string;
  columns: DataColumn<T>[];
  empty?: ReactNode;
  getKey: (item: T) => string;
  items: T[];
  rowClassName?: (item: T) => string | undefined;
}

export function DataTable<T>({ ariaLabel, columns, empty, getKey, items, rowClassName }: DataTableProps<T>) {
  if (items.length === 0) {
    return empty ?? <EmptyState title="Sin resultados" description="No hay elementos que coincidan con esta vista." />;
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{ariaLabel}</caption>
          <thead className="bg-[var(--color-surface-container)] text-xs uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
            <tr>
              {columns.map((column) => <th key={column.id} scope="col" className={cx("px-5 py-4 font-bold", column.className)}>{column.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={getKey(item)}
                className={cx(
                  "border-t border-[var(--color-outline-variant)] transition-colors first:border-t-0 hover:bg-[var(--color-surface-container)]",
                  rowClassName?.(item),
                )}
              >
                {columns.map((column) => <td key={column.id} className={cx("px-5 py-4", column.className)}>{column.render(item)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={ariaLabel}>
        {items.map((item) => (
          <li key={getKey(item)} className={cx("rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-low)] p-5", rowClassName?.(item))}>
            <dl className="grid gap-4">
              {columns.map((column) => (
                <div key={column.id} className="grid gap-1">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                    {column.mobileLabel ?? column.header}
                  </dt>
                  <dd className="min-w-0 text-sm text-[var(--color-on-surface)]">{column.render(item)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
