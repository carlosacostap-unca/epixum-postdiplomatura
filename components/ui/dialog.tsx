"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, IconButton } from "./button";
import { cx } from "./styles";

export interface DialogProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  dismissible?: boolean;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}

export function Dialog({
  children,
  className,
  description,
  dismissible = true,
  footer,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const firstFocusable = dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const restoreFocus = () => {
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const requestClose = () => {
    if (!dismissible) return;
    onOpenChange(false);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cx(
        "m-auto max-h-[min(90dvh,48rem)] w-[min(calc(100%_-_2rem),36rem)] overflow-hidden rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-0 text-[var(--color-on-surface)] shadow-[var(--epixum-shadow-floating)] backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={restoreFocus}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="flex max-h-[min(90dvh,48rem)] flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 md:px-8 md:pt-8">
          <div className="min-w-0">
            <h2 id={titleId} className="font-headline text-xl font-bold tracking-tight md:text-2xl">
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="mt-2 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                {description}
              </div>
            ) : null}
          </div>
          {dismissible ? (
            <IconButton
              label="Cerrar diálogo"
              icon={<span className="material-symbols-outlined">close</span>}
              variant="ghost"
              onClick={requestClose}
              className="-mr-2 -mt-2"
            />
          ) : null}
        </header>

        <div className="overflow-y-auto px-6 py-2 md:px-8">{children}</div>

        {footer ? (
          <footer className="flex flex-col-reverse gap-3 px-6 pb-6 pt-5 sm:flex-row sm:justify-end md:px-8 md:pb-8">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: ReactNode;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  tone?: "default" | "danger";
}

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  tone = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      dismissible={!isPending}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            isPending={isPending}
            pendingLabel="Procesando…"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="sr-only">Confirmación requerida</div>
    </Dialog>
  );
}
