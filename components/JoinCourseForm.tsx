"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Field, useToast } from "@/components/ui";
import { joinCourseByKey } from "@/lib/actions-course-enrollment";

export default function JoinCourseForm({ className }: { className?: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen || courseId) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [courseId, isOpen]);

  const close = () => {
    setIsOpen(false);
    setError("");
    setMessage("");
    setCourseId(null);
    setKey("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await joinCourseByKey(key);
        if (!result.success || !result.courseId) {
          setError(result.error || "No pudimos completar la matrícula.");
          inputRef.current?.focus();
          return;
        }
        setMessage(result.message || "Matrícula completada.");
        setCourseId(result.courseId);
        setKey("");
        notify({ title: "Matrícula completada", description: result.message, tone: "success" });
        router.refresh();
      } catch {
        setError("No pudimos conectar con el servidor. Intentá nuevamente.");
        inputRef.current?.focus();
      }
    });
  };

  return (
    <>
      <Button className={className} leadingIcon={<span className="material-symbols-outlined text-lg">add</span>} onClick={() => setIsOpen(true)}>Sumarme a un curso</Button>
      <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : close()} title={courseId ? "¡Ya sos parte del curso!" : "Sumarme a un curso"} description={courseId ? "La matrícula quedó activa inmediatamente." : "Ingresá la clave que te compartió el docente."}>
        {courseId ? (
          <div className="space-y-6 pb-6">
            <p role="status" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-success)]/10 p-4 text-sm text-[var(--color-success)]">{message}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close}>Cerrar</Button>
              <Link href={`/estudiantes/cursos/${courseId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]">Abrir el curso <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 pb-6">
            <Field id="course-key" label="Clave del curso" required error={error || undefined} hint="La clave distingue mayúsculas y minúsculas.">
              <input ref={inputRef} type="text" value={key} onChange={(event) => setKey(event.target.value)} minLength={6} maxLength={64} autoComplete="off" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" />
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close} disabled={isPending}>Cancelar</Button>
              <Button type="submit" isPending={isPending} pendingLabel="Matriculando…" disabled={!key.trim()}>Matricularme</Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
