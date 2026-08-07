"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { CourseEnrollmentInvitation } from "@/types";
import { activateCourseInvitation } from "@/lib/actions-course-invitations";
import { Button, Card, CardContent, Dialog } from "@/components/ui";

export interface PendingCourseInvitationsProps {
  invitations: CourseEnrollmentInvitation[];
}

export default function PendingCourseInvitations({ invitations }: PendingCourseInvitationsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CourseEnrollmentInvitation | null>(null);
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{ error?: string; attemptsRemaining?: number; lockedUntil?: string } | null>(null);
  const [activatedCourseId, setActivatedCourseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  function openInvitation(invitation: CourseEnrollmentInvitation) {
    setSelected(invitation);
    setPassword("");
    setFeedback(null);
    setActivatedCourseId(null);
  }

  function closeDialog() {
    if (isPending) return;
    setSelected(null);
    setPassword("");
    setFeedback(null);
    setActivatedCourseId(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      const result = await activateCourseInvitation(selected.id, selected.course, password);
      if (!result.success) {
        setFeedback({
          error: result.error,
          attemptsRemaining: result.attemptsRemaining,
          lockedUntil: result.lockedUntil,
        });
        return;
      }
      setFeedback(null);
      setActivatedCourseId(result.courseId || selected.course);
      router.refresh();
    });
  }

  const selectedCourse = selected?.expand?.course;
  const isLocked = Boolean(feedback?.lockedUntil);

  return (
    <section aria-labelledby="pending-invitations-title" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Acceso pendiente</p>
        <h2 id="pending-invitations-title" className="mt-1 font-headline text-2xl font-bold md:text-3xl">Invitaciones pendientes</h2>
        <p className="mt-1 text-[var(--color-on-surface-variant)]">Tu email ya fue autorizado. Ingresá la contraseña compartida para activar el curso.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {invitations.map((invitation) => {
          const course = invitation.expand?.course;
          return (
            <Card key={invitation.id} className="h-full border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
              <CardContent className="flex h-full flex-col">
                <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]" aria-hidden="true">mark_email_unread</span>
                <h3 className="mt-4 font-headline text-xl font-bold">{course?.title || "Curso invitado"}</h3>
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">La invitación todavía no forma parte de Mis cursos.</p>
                <Button className="mt-6 self-start" onClick={() => openInvitation(invitation)}>Activar curso</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && closeDialog()}
        dismissible={!isPending}
        title={activatedCourseId ? "Curso activado" : `Activar ${selectedCourse?.title || "curso"}`}
        description={activatedCourseId ? "La matrícula ya está disponible en Mis cursos." : "Ingresá la contraseña que te compartieron por fuera de Epixum."}
        footer={activatedCourseId ? (
          <>
            <Button variant="ghost" onClick={closeDialog}>Cerrar</Button>
            <Link href={`/estudiantes/cursos/${activatedCourseId}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]">Abrir curso</Link>
          </>
        ) : undefined}
      >
        {activatedCourseId ? (
          <div role="status" className="rounded-[var(--epixum-radius-lg)] bg-[var(--color-success-container)] p-5 text-[var(--color-on-success-container)]">La activación se completó correctamente.</div>
        ) : (
          <form className="space-y-5 pb-6" onSubmit={submit}>
            <div>
              <label htmlFor="invitation-password" className="mb-2 block text-sm font-bold">Contraseña del curso</label>
              <input
                autoFocus
                data-dialog-initial-focus
                id="invitation-password"
                type="password"
                minLength={8}
                maxLength={64}
                required
                disabled={isPending || isLocked}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3"
              />
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">Entre 8 y 64 caracteres. Distingue mayúsculas y minúsculas.</p>
            </div>
            {feedback?.error && (
              <div role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">
                <p className="font-bold">{feedback.error}</p>
                {!isLocked && feedback.attemptsRemaining !== undefined && <p className="mt-1">Te quedan {feedback.attemptsRemaining} intentos antes del bloqueo temporal.</p>}
                {isLocked && <p className="mt-1">Podrás volver a intentarlo después de las {new Date(feedback.lockedUntil!).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.</p>}
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeDialog} disabled={isPending}>Cancelar</Button>
              <Button type="submit" isPending={isPending} disabled={isLocked || password.length < 8} pendingLabel="Activando…">Activar curso</Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
