"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CourseEnrollmentInvitation, CourseInvitationStatus } from "@/types";
import { createCourseInvitations, revokeCourseInvitation } from "@/lib/actions-course-invitations";
import { parseInvitationEmails } from "@/lib/course-invitations";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/ui";

const statusTone = { pendiente: "warning", activada: "success", revocada: "neutral" } as const;

export interface CourseInvitationManagerProps {
  basePath?: string;
  courseId: string;
  enabled: boolean;
  invitations: CourseEnrollmentInvitation[];
  page: number;
  totalPages: number;
  status?: CourseInvitationStatus;
}

export default function CourseInvitationManager({ basePath, courseId, enabled, invitations, page, totalPages, status }: CourseInvitationManagerProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(() => parseInvitationEmails(bulkEmails), [bulkEmails]);

  function importEmails(value: string, clear: () => void) {
    startTransition(async () => {
      try {
        const result = await createCourseInvitations(courseId, value);
        if (!result.success) {
          notify({ title: "No se cargaron invitaciones", description: result.error, tone: "error" });
          return;
        }
        clear();
        notify({
          title: `${result.created.length} invitaciones creadas`,
          description: `${result.existing.length} existentes · ${result.revoked.length} revocadas · ${result.invalid.length} inválidas`,
          tone: result.invalid.length || result.revoked.length ? "warning" : "success",
        });
        router.refresh();
      } catch {
        notify({ title: "No se cargaron invitaciones", description: "Verificá tus permisos e intentá nuevamente.", tone: "error" });
      }
    });
  }

  function confirmRevoke() {
    if (!revokeId) return;
    startTransition(async () => {
      const result = await revokeCourseInvitation(revokeId);
      if (!result.success) notify({ title: "No se pudo revocar", description: result.error, tone: "error" });
      else {
        notify({ title: "Invitación revocada", tone: "success" });
        setRevokeId(null);
        router.refresh();
      }
    });
  }

  const filterHref = (next?: CourseInvitationStatus) => `${basePath || `/admin/courses/${courseId}`}${next ? `?invitaciones=${next}` : ""}`;

  return (
    <section aria-labelledby="invitation-manager-title" className="mt-8 space-y-6 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6 md:p-8">
      <div>
        <h2 id="invitation-manager-title" className="font-headline text-2xl font-bold">Emails autorizados</h2>
        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Epixum no envía emails. Comunicá la invitación y la contraseña por fuera de la plataforma.</p>
      </div>

      {!enabled && <p role="status" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-warning-container)] p-4 text-sm text-[var(--color-on-warning-container)]">Las invitaciones se conservan, pero sólo pueden cargarse o activarse cuando el curso usa email y contraseña.</p>}

      <div className="grid gap-5 lg:grid-cols-2" aria-disabled={!enabled}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); importEmails(singleEmail, () => setSingleEmail("")); }}>
          <label htmlFor={`single-email-${courseId}`} className="block text-sm font-bold">Agregar un email</label>
          <input id={`single-email-${courseId}`} type="email" value={singleEmail} onChange={(event) => setSingleEmail(event.target.value)} disabled={!enabled || isPending} required className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" placeholder="alumno@ejemplo.com" />
          <Button type="submit" disabled={!enabled || !singleEmail.trim()} isPending={isPending}>Autorizar email</Button>
        </form>

        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); importEmails(bulkEmails, () => setBulkEmails("")); }}>
          <label htmlFor={`bulk-email-${courseId}`} className="block text-sm font-bold">Carga masiva</label>
          <textarea id={`bulk-email-${courseId}`} value={bulkEmails} onChange={(event) => setBulkEmails(event.target.value)} disabled={!enabled || isPending} rows={4} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" placeholder="Separá emails por líneas, comas o punto y coma" />
          <p className="text-xs text-[var(--color-on-surface-variant)]" aria-live="polite">{preview.valid.length} válidos · {preview.invalid.length} inválidos · {preview.duplicates.length} repetidos</p>
          <Button type="submit" disabled={!enabled || preview.valid.length === 0} isPending={isPending}>Confirmar carga masiva</Button>
        </form>
      </div>

      <nav aria-label="Filtrar invitaciones" className="flex flex-wrap gap-2">
        {([undefined, "pendiente", "activada", "revocada"] as const).map((value) => <Link key={value || "todas"} href={filterHref(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${status === value ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-highest)]"}`}>{value || "todas"}</Link>)}
      </nav>

      {invitations.length === 0 ? <EmptyState icon="mark_email_unread" title="Sin invitaciones" description="No hay emails en este estado." /> : (
        <ul className="divide-y divide-[var(--color-outline-variant)] rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-lowest)] px-5">
          {invitations.map((invitation) => <li key={invitation.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate font-bold">{invitation.emailNormalized}</p><div className="mt-2"><Badge tone={statusTone[invitation.status]}>{invitation.status}</Badge></div></div>
            {invitation.status === "pendiente" && <Button variant="secondary" onClick={() => setRevokeId(invitation.id)}>Revocar</Button>}
          </li>)}
        </ul>
      )}

      {totalPages > 1 && <div className="flex items-center justify-between text-sm"><Link aria-disabled={page <= 1} href={`${filterHref(status)}${status ? "&" : "?"}pagina=${Math.max(1, page - 1)}`}>Anterior</Link><span>Página {page} de {totalPages}</span><Link aria-disabled={page >= totalPages} href={`${filterHref(status)}${status ? "&" : "?"}pagina=${Math.min(totalPages, page + 1)}`}>Siguiente</Link></div>}

      <ConfirmDialog open={Boolean(revokeId)} onOpenChange={(open) => !open && setRevokeId(null)} title="Revocar invitación" description="El email dejará de poder activar el curso. Esta acción no elimina matrículas existentes." confirmLabel="Revocar" tone="danger" isPending={isPending} onConfirm={confirmRevoke} />
    </section>
  );
}
