"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { IconButton } from "./button";
import { cx } from "./styles";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastInput {
  description?: ReactNode;
  duration?: number | null;
  title: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
  tone: ToastTone;
}

interface ToastContextValue {
  dismiss: (id: number) => void;
  notify: (toast: ToastInput) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

const toneClasses: Record<ToastTone, string> = {
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-error)]",
  warning: "text-[var(--color-warning)]",
  info: "text-[var(--color-info)]",
};

const toneIcons: Record<ToastTone, string> = {
  success: "check_circle",
  error: "error",
  warning: "warning",
  info: "info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput) => {
    const id = nextToastId++;
    const tone = input.tone ?? "info";
    setToasts((current) => [...current, { ...input, id, tone }]);
    return id;
  }, []);

  const value = useMemo(() => ({ dismiss, notify }), [dismiss, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider");
  return context;
}

function ToastViewport({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[200] flex flex-col items-end gap-3 sm:left-auto sm:w-[min(26rem,calc(100%_-_2rem))]"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, dismiss }: { toast: ToastItem; dismiss: (id: number) => void }) {
  const duration = toast.duration === undefined ? (toast.tone === "error" ? null : 5000) : toast.duration;

  useEffect(() => {
    if (duration === null) return;
    const timer = window.setTimeout(() => dismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, duration, toast.id]);

  return (
    <section
      className="pointer-events-auto flex w-full items-start gap-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-high)] p-4 text-[var(--color-on-surface)] shadow-[var(--epixum-shadow-floating)]"
      role={toast.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
    >
      <span className={cx("material-symbols-outlined mt-0.5", toneClasses[toast.tone])} aria-hidden="true">
        {toneIcons[toast.tone]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{toast.title}</p>
        {toast.description ? (
          <div className="mt-1 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">{toast.description}</div>
        ) : null}
      </div>
      <IconButton
        label="Cerrar notificación"
        icon={<span className="material-symbols-outlined text-lg">close</span>}
        variant="ghost"
        onClick={() => dismiss(toast.id)}
        className="-mr-2 -mt-2"
      />
    </section>
  );
}
