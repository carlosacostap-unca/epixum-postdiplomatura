"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cx } from "./styles";

interface FieldControlProps {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export interface FieldProps {
  children: ReactElement<FieldControlProps>;
  className?: string;
  error?: string;
  hint?: ReactNode;
  id?: string;
  label: string;
  required?: boolean;
}

export function Field({ children, className, error, hint, id, label, required = false }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId.replace(/:/g, "")}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  if (!isValidElement(children)) return null;

  const control = cloneElement(children, {
    id: children.props.id ?? controlId,
    required: children.props.required ?? required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={control.props.id} className="text-sm font-bold text-[var(--color-on-surface)]">
        {label}
        {required ? <span className="ml-1 text-[var(--color-error)]" aria-hidden="true">*</span> : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="text-sm text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-sm font-medium text-[var(--color-error)]" role="alert">
          <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">error</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
