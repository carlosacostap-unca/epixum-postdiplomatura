import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { cx } from "./styles";

export interface DataListProps<T> {
  ariaLabel: string;
  className?: string;
  empty?: ReactNode;
  getKey: (item: T) => string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}

export function DataList<T>({ ariaLabel, className, empty, getKey, items, renderItem }: DataListProps<T>) {
  if (items.length === 0) {
    return empty ?? <EmptyState title="Sin resultados" description="No hay elementos para mostrar en este momento." />;
  }

  return (
    <ul aria-label={ariaLabel} className={cx("flex flex-col gap-3", className)}>
      {items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}
    </ul>
  );
}
