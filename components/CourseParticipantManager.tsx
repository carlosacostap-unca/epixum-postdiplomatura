"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCourseStudents,
  addCourseTeachers,
  removeCourseStudent,
  removeCourseTeacher,
  searchCourseParticipantCandidates,
} from "@/lib/actions-course-participants";
import type {
  CourseParticipant,
  CourseParticipantCandidate,
  CourseParticipantKind,
  CourseParticipantPage,
} from "@/types";
import { Button, ConfirmDialog, DataTable, Dialog, EmptyState, useToast } from "@/components/ui";

function ParticipantPickerDialog({ courseId, open, target, onOpenChange }: { courseId: string; open: boolean; target: CourseParticipantKind; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<CourseParticipantCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const noun = target === "students" ? "alumnos" : "docentes";

  useEffect(() => {
    if (!open) return;
    const normalized = query.trim();
    if (normalized.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        try {
          const result = await searchCourseParticipantCandidates(courseId, target, normalized);
          if (!active) return;
          setCandidates(result.items);
          setFeedback(result.totalItems ? `${result.totalItems} cuentas encontradas.` : "No encontramos cuentas con esa búsqueda.");
        } catch {
          if (active) setFeedback("No pudimos buscar cuentas. Intentá nuevamente.");
        }
      });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [courseId, open, query, target]);

  function changeQuery(value: string) {
    setQuery(value);
    setCandidates([]);
    setSelected([]);
    setFeedback("");
  }

  function toggle(userId: string) {
    setSelected((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  function confirm() {
    startSaving(async () => {
      const result = target === "students"
        ? await addCourseStudents(courseId, selected)
        : await addCourseTeachers(courseId, selected);
      if (result.status !== "success") {
        setFeedback(result.message);
        return;
      }
      notify({ title: target === "students" ? "Alumnos agregados" : "Docentes agregados", description: result.message, tone: "success" });
      setQuery("");
      setCandidates([]);
      setSelected([]);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isSaving && onOpenChange(next)}
      dismissible={!isSaving}
      title={`Agregar ${noun}`}
      description="Seleccioná cuentas existentes. Una persona puede participar de forma diferente en otros cursos."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button><Button onClick={confirm} isPending={isSaving} disabled={selected.length === 0}>Agregar {selected.length || ""} {noun}</Button></>}
    >
      <label htmlFor={`participant-search-${target}`} className="block text-sm font-bold">Buscar por nombre o correo</label>
      <input data-dialog-initial-focus id={`participant-search-${target}`} type="search" value={query} onChange={(event) => changeQuery(event.target.value)} disabled={isSaving} className="mt-2 min-h-11 w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4" placeholder="Ej.: Ana o ana@ejemplo.com" />
      <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]" role={feedback.startsWith("No pudimos") ? "alert" : "status"} aria-live="polite">{isSearching ? "Buscando cuentas…" : query.trim().length < 2 ? (query.trim() ? "Escribí al menos dos caracteres." : "Buscá por nombre o correo.") : feedback}</p>
      <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto" aria-label="Cuentas encontradas">
        {candidates.map((candidate) => {
          const disabled = candidate.state !== "available";
          return <li key={candidate.userId} className="rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container)] p-3">
            <label className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed opacity-65" : "cursor-pointer"}`}>
              <input type="checkbox" className="mt-1 size-5" checked={selected.includes(candidate.userId)} onChange={() => toggle(candidate.userId)} disabled={disabled || isSaving} />
              <span className="min-w-0"><span className="block font-bold">{candidate.name}</span><span className="block truncate text-sm text-[var(--color-on-surface-variant)]">{candidate.email}</span>{candidate.reason ? <span className="mt-1 block text-xs font-medium text-[var(--color-warning)]">{candidate.reason}</span> : null}</span>
            </label>
          </li>;
        })}
      </ul>
    </Dialog>
  );
}

export default function CourseParticipantManager({ courseId, courseTitle, page, query, target }: { courseId: string; courseTitle: string; page: CourseParticipantPage; query: string; target: CourseParticipantKind }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CourseParticipant | null>(null);
  const [isRemoving, startRemoving] = useTransition();
  const isStudents = target === "students";
  const tab = isStudents ? "alumnos" : "docentes";
  const label = isStudents ? "alumnos" : "docentes";

  const columns = useMemo(() => [
    { id: "person", header: "Persona", mobileLabel: "Persona", render: (participant: CourseParticipant) => <div className="min-w-0"><p className="font-bold">{participant.name}</p><p className="truncate text-xs text-[var(--color-on-surface-variant)]">{participant.email}</p></div> },
    { id: "participation", header: "Participación", render: () => <span className="inline-flex rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">{isStudents ? "Alumno" : "Docente"}</span> },
    { id: "actions", header: <span className="sr-only">Acciones</span>, mobileLabel: "Acciones", className: "text-right", render: (participant: CourseParticipant) => <Button variant="ghost" onClick={() => setRemoveTarget(participant)}>Retirar</Button> },
  ], [isStudents]);

  function href(nextPage: number) {
    const params = new URLSearchParams({ tab, page: String(nextPage) });
    if (query) params.set("q", query);
    return `/admin/courses/${courseId}/participants?${params}`;
  }

  function confirmRemove() {
    if (!removeTarget) return;
    startRemoving(async () => {
      const result = isStudents
        ? await removeCourseStudent(courseId, removeTarget.enrollmentId || "")
        : await removeCourseTeacher(courseId, removeTarget.userId);
      if (result.status !== "success") {
        notify({ title: `No se pudo retirar al ${isStudents ? "alumno" : "docente"}`, description: result.message, tone: "error" });
        return;
      }
      notify({ title: isStudents ? "Alumno retirado" : "Docente retirado", description: result.message, tone: "success" });
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="participant-list-title" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 id="participant-list-title" className="font-headline text-2xl font-bold capitalize">{label} del curso</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{page.totalItems} {page.totalItems === 1 ? (isStudents ? "alumno" : "docente") : label}</p></div>
        <Button leadingIcon={<span className="material-symbols-outlined" aria-hidden="true">person_add</span>} onClick={() => setPickerOpen(true)}>Agregar {label}</Button>
      </div>

      <form method="get" className="flex flex-col gap-3 sm:flex-row" role="search">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="member-search" className="sr-only">Buscar {label}</label>
        <input id="member-search" name="q" type="search" defaultValue={query} className="min-h-11 min-w-0 flex-1 rounded-[var(--epixum-radius-pill)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-5" placeholder={`Buscar ${label} por nombre o correo`} />
        <Button type="submit" variant="secondary">Buscar</Button>
        {query ? <Link href={`/admin/courses/${courseId}/participants?tab=${tab}`} className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold">Limpiar</Link> : null}
      </form>

      <p className="sr-only" role="status" aria-live="polite">{page.totalItems} resultados</p>
      <DataTable ariaLabel={`${label} de ${courseTitle}`} columns={columns} getKey={(participant) => participant.id} items={page.items} empty={<EmptyState icon="group_off" title={query ? "Sin coincidencias" : `Sin ${label}`} description={query ? "Probá con otro nombre o correo." : `Todavía no hay ${label} en este curso.`} />} />

      {page.totalPages > 1 ? <nav aria-label={`Páginas de ${label}`} className="flex items-center justify-between text-sm"><Link aria-disabled={page.page <= 1} tabIndex={page.page <= 1 ? -1 : undefined} href={href(Math.max(1, page.page - 1))} className="rounded-full px-4 py-3 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50">Anterior</Link><span>Página {page.page} de {page.totalPages}</span><Link aria-disabled={page.page >= page.totalPages} tabIndex={page.page >= page.totalPages ? -1 : undefined} href={href(Math.min(page.totalPages, page.page + 1))} className="rounded-full px-4 py-3 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50">Siguiente</Link></nav> : null}

      <ParticipantPickerDialog courseId={courseId} open={pickerOpen} target={target} onOpenChange={setPickerOpen} />
      <ConfirmDialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)} title={`Retirar ${isStudents ? "alumno" : "docente"}`} description={removeTarget ? <span>Vas a retirar a <strong>{removeTarget.name}</strong> de <strong>{courseTitle}</strong> como {isStudents ? "alumno" : "docente"}. {isStudents ? "Sus entregas, consultas y evaluaciones" : "El contenido y la actividad del curso"} se conservarán.</span> : ""} confirmLabel="Retirar participación" tone="danger" isPending={isRemoving} onConfirm={confirmRemove} />
    </section>
  );
}
