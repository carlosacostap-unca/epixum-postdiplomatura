"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  assignContentToWeek,
  createCourseWeek,
  deleteCourseWeek,
  updateCourseWeek,
} from "@/lib/actions-course-weeks";
import type { Assignment, Class, CourseWeek, Inquiry } from "@/types";
import { Badge, Button, Card, CardContent, ConfirmDialog, Dialog, EmptyState, useToast } from "@/components/ui";

type WeeklyItem =
  | { id: string; title: string; type: "class"; href: string }
  | { id: string; title: string; type: "assignment"; href: string }
  | { id: string; title: string; type: "inquiry"; href: string };

interface WeekGroup {
  week: CourseWeek;
  classes: Class[];
  assignments: Assignment[];
  inquiries: Inquiry[];
}

interface Props {
  courseId: string;
  groups: WeekGroup[];
  unassigned: { classes: Class[]; assignments: Assignment[]; inquiries: Inquiry[] };
  weeks: CourseWeek[];
}

const fieldClass = "min-h-11 w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function dateOnly(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function weekItems(courseId: string, group: Omit<WeekGroup, "week">): WeeklyItem[] {
  return [
    ...group.classes.map((item) => ({ id: item.id, title: item.title, type: "class" as const, href: `/docentes/cursos/${courseId}/clases/${item.id}` })),
    ...group.assignments.map((item) => ({ id: item.id, title: item.title, type: "assignment" as const, href: `/docentes/cursos/${courseId}/tps/${item.id}` })),
    ...group.inquiries.map((item) => ({ id: item.id, title: item.title, type: "inquiry" as const, href: `/docentes/cursos/${courseId}/consultas/${item.id}` })),
  ];
}

function statusTone(status: CourseWeek["status"]): "neutral" | "success" | "info" {
  if (status === "publicada") return "success";
  if (status === "programada") return "info";
  return "neutral";
}

function statusLabel(status: CourseWeek["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function FieldError({ children }: { children?: string }) {
  return children ? <span role="alert" className="block text-sm font-normal text-[var(--color-error)]">{children}</span> : null;
}

function WeekFields({ week, errors }: { week?: CourseWeek; errors: Record<string, string> }) {
  const [status, setStatus] = useState<CourseWeek["status"]>(week?.status || "borrador");
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-bold">Número
        <input className={fieldClass} name="number" type="number" min="0" step="1" required defaultValue={week?.number} aria-invalid={Boolean(errors.number)} />
        <FieldError>{errors.number}</FieldError>
      </label>
      <label className="space-y-2 text-sm font-bold">Título
        <input className={fieldClass} name="title" required defaultValue={week?.title} placeholder="Ej: Fundamentos" aria-invalid={Boolean(errors.title)} />
        <FieldError>{errors.title}</FieldError>
      </label>
      <label className="space-y-2 text-sm font-bold">Fecha de inicio <span className="font-normal text-[var(--color-on-surface-variant)]">(opcional)</span>
        <input className={fieldClass} name="startDate" type="date" defaultValue={dateOnly(week?.startDate)} aria-invalid={Boolean(errors.startDate)} />
        <FieldError>{errors.startDate}</FieldError>
      </label>
      <label className="space-y-2 text-sm font-bold">Fecha de finalización <span className="font-normal text-[var(--color-on-surface-variant)]">(opcional)</span>
        <input className={fieldClass} name="endDate" type="date" defaultValue={dateOnly(week?.endDate)} aria-invalid={Boolean(errors.endDate)} />
        <FieldError>{errors.endDate}</FieldError>
      </label>
      <label className="space-y-2 text-sm font-bold">Estado
        <select className={fieldClass} name="status" value={status} onChange={(event) => setStatus(event.target.value as CourseWeek["status"])}>
          <option value="borrador">Borrador</option>
          <option value="publicada">Publicada</option>
          <option value="programada">Programada</option>
        </select>
        <FieldError>{errors.status}</FieldError>
      </label>
      {status === "programada" ? (
        <label className="space-y-2 text-sm font-bold">Publicar el
          <input className={fieldClass} name="publishAt" type="datetime-local" required defaultValue={localDateTime(week?.publishAt)} aria-invalid={Boolean(errors.publishAt)} />
          <FieldError>{errors.publishAt}</FieldError>
        </label>
      ) : null}
    </div>
  );
}

function ContentMover({ courseId, item, weeks, currentWeek }: { courseId: string; item: WeeklyItem; weeks: CourseWeek[]; currentWeek?: string }) {
  const router = useRouter();
  const [target, setTarget] = useState(currentWeek || "");
  const [pending, setPending] = useState(false);
  const { notify } = useToast();

  async function move() {
    setPending(true);
    const result = await assignContentToWeek(courseId, item.type, item.id, target || undefined);
    setPending(false);
    if (!result.success) return notify({ title: result.error || "No se pudo mover el contenido", tone: "error" });
    notify({ title: target ? "Contenido asignado a la semana" : "Contenido dejado sin semana", tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4 sm:flex-row sm:items-center">
      <Link className="min-w-0 flex-1 font-bold hover:text-[var(--color-primary)]" href={item.href}>{item.title}</Link>
      <label className="sr-only" htmlFor={`week-${item.type}-${item.id}`}>Semana para {item.title}</label>
      <select id={`week-${item.type}-${item.id}`} className={`${fieldClass} sm:w-52`} value={target} onChange={(event) => setTarget(event.target.value)}>
        <option value="">Sin semana</option>
        {weeks.map((week) => <option key={week.id} value={week.id}>Semana {week.number}</option>)}
      </select>
      <Button variant="secondary" size="sm" onClick={move} isPending={pending} pendingLabel="Moviendo…">Mover</Button>
    </div>
  );
}

export default function TeacherWeeklyCourseManager({ courseId, groups, unassigned, weeks }: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const [formWeek, setFormWeek] = useState<CourseWeek | "new" | null>(null);
  const [deleteWeek, setDeleteWeek] = useState<CourseWeek | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const orphanItems = weekItems(courseId, unassigned);

  async function saveWeek(formData: FormData) {
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    const result = formWeek === "new"
      ? await createCourseWeek(courseId, formData)
      : formWeek
        ? await updateCourseWeek(formWeek.id, formData)
        : { success: false as const, error: "No hay una semana seleccionada" };
    setPending(false);
    if (!result.success) {
      if ("errors" in result && result.errors) setFieldErrors(result.errors);
      const message = "errors" in result && result.errors ? "Revisá los campos señalados." : result.error;
      setFormError(message || "No se pudo guardar la semana");
      return;
    }
    setFormWeek(null);
    notify({ title: formWeek === "new" ? "Semana creada" : "Semana actualizada", tone: "success" });
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteWeek) return;
    setPending(true);
    const result = await deleteCourseWeek(deleteWeek.id);
    setPending(false);
    if (!result.success) return notify({ title: result.error || "No se pudo eliminar la semana", tone: "error" });
    setDeleteWeek(null);
    notify({ title: "Semana eliminada; su contenido quedó sin asignar", tone: "success" });
    router.refresh();
  }

  return (
    <section id="semanas" aria-labelledby="weeks-title" className="scroll-mt-6 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 id="weeks-title" className="font-headline text-2xl font-bold md:text-3xl">Organización por semanas</h2>
          <p className="mt-1 text-[var(--color-on-surface-variant)]">Creá las semanas y ubicá clases, trabajos prácticos y consultas en cada una.</p>
        </div>
        <Button onClick={() => { setFormError(null); setFieldErrors({}); setFormWeek("new"); }} leadingIcon={<span className="material-symbols-outlined" aria-hidden="true">add</span>}>Nueva semana</Button>
      </div>

      {weeks.length === 0 ? (
        <EmptyState icon="calendar_view_week" title="Todavía no hay semanas" description="Creá la primera semana para comenzar a organizar el contenido." action={<Button onClick={() => setFormWeek("new")}>Crear primera semana</Button>} />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const items = weekItems(courseId, group);
            return (
              <Card key={group.week.id}>
                <CardContent className="space-y-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3"><Badge tone="info">Semana {group.week.number}</Badge><Badge tone={statusTone(group.week.status)}>{statusLabel(group.week.status)}</Badge></div>
                      <h3 className="mt-3 font-headline text-2xl font-bold">{group.week.title}</h3>
                      <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                        {group.week.startDate || group.week.endDate ? `${group.week.startDate ? new Date(group.week.startDate).toLocaleDateString("es-AR") : "Sin inicio"} — ${group.week.endDate ? new Date(group.week.endDate).toLocaleDateString("es-AR") : "Sin finalización"}` : "Sin fechas definidas"}
                      </p>
                      {group.week.status === "programada" && group.week.publishAt ? <p className="mt-2 text-sm font-medium text-[var(--color-info)]">Publicación programada: {new Date(group.week.publishAt).toLocaleString("es-AR")}</p> : null}
                      <p className="mt-2 text-sm">{group.classes.length} clases · {group.assignments.length} trabajos · {group.inquiries.length} consultas</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-surface-container-highest)] px-4 text-sm font-bold" href={`/docentes/cursos/${courseId}/clases/nueva?semana=${group.week.id}`}>Nueva clase</Link>
                      <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-surface-container-highest)] px-4 text-sm font-bold" href={`/docentes/cursos/${courseId}/tps/nuevo?semana=${group.week.id}`}>Nuevo trabajo</Link>
                      <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFieldErrors({}); setFormWeek(group.week); }}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteWeek(group.week)}>Eliminar</Button>
                    </div>
                  </div>
                  {items.length ? <div className="space-y-3">{items.map((item) => <ContentMover key={`${item.type}-${item.id}`} courseId={courseId} item={item} weeks={weeks} currentWeek={group.week.id} />)}</div> : <p className="rounded-xl bg-[var(--color-surface-container)] p-4 text-sm text-[var(--color-on-surface-variant)]">Esta semana todavía no contiene clases, trabajos ni consultas.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="space-y-5">
          <div><h3 className="font-headline text-xl font-bold">Contenido sin semana</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Solo lo ve el equipo docente hasta que lo asignes a una semana publicada o programada.</p></div>
          {orphanItems.length ? <div className="space-y-3">{orphanItems.map((item) => <ContentMover key={`${item.type}-${item.id}`} courseId={courseId} item={item} weeks={weeks} />)}</div> : <p className="text-sm text-[var(--color-on-surface-variant)]">Todo el contenido está asignado.</p>}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(formWeek)}
        onOpenChange={(open) => { if (!open) setFormWeek(null); }}
        title={formWeek === "new" ? "Crear semana" : "Editar semana"}
        description="El estado controla cuándo podrán verla los estudiantes. Las fechas del período son opcionales."
        dismissible={!pending}
      >
        <form action={saveWeek} className="space-y-6 pb-6">
          {formError ? <p role="alert" className="rounded-xl bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{formError}</p> : null}
          <WeekFields key={formWeek === "new" ? "new" : formWeek?.id} week={formWeek === "new" ? undefined : formWeek || undefined} errors={fieldErrors} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setFormWeek(null)} disabled={pending}>Cancelar</Button><Button type="submit" isPending={pending} pendingLabel="Guardando…">Guardar semana</Button></div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteWeek)}
        onOpenChange={(open) => { if (!open) setDeleteWeek(null); }}
        title={`Eliminar ${deleteWeek ? `Semana ${deleteWeek.number}` : "semana"}`}
        description="La semana se eliminará, pero sus clases, trabajos prácticos y consultas se conservarán como contenido sin semana."
        confirmLabel="Eliminar semana"
        tone="danger"
        isPending={pending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
