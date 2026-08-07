"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Select, useToast } from "@/components/ui";
import { createInquiry } from "@/lib/actions-inquiries";
import type { Class, CourseWeek } from "@/types";

interface Props {
  basePath: string;
  classes: Class[];
  courseId: string;
  initialClassId?: string;
  initialWeekId?: string;
  weekly?: boolean;
  weeks?: CourseWeek[];
}

export default function NewInquiryForm({
  courseId,
  classes,
  weeks = [],
  weekly = false,
  basePath,
  initialClassId = "",
  initialWeekId = "",
}: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState(initialClassId);
  const initialClassWeek = classes.find((item) => item.id === initialClassId)?.week;
  const [weekId, setWeekId] = useState(initialClassWeek || initialWeekId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim() || (weekly && !weekId)) {
      setError(weekly && !weekId ? "Seleccioná una semana para la consulta." : "Completá el título y la descripción.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await createInquiry({
        title: title.trim(),
        description: description.trim(),
        courseId,
        classId: classId || undefined,
        weekId: weekId || undefined,
      });
      if (!result.success) {
        setError(result.error || "No se pudo crear la consulta.");
        return;
      }
      notify({ title: "Consulta creada", description: "La conversación ya está disponible en el foro.", tone: "success" });
      router.push(basePath);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}
      <Field id="inquiry-title" label="Título" required>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" />
      </Field>
      {weekly ? (
        <Field id="inquiry-week" label="Semana" required>
          <Select value={weekId} onChange={(event) => {
            setWeekId(event.target.value);
            const selectedClass = classes.find((item) => item.id === classId);
            if (selectedClass?.week && selectedClass.week !== event.target.value) setClassId("");
          }}>
            <option value="">Seleccioná una semana</option>
            {weeks.map((week) => <option key={week.id} value={week.id}>Semana {week.number}: {week.title}</option>)}
          </Select>
        </Field>
      ) : null}
      <Field id="inquiry-class" label="Clase relacionada" hint="Opcional">
        <Select value={classId} onChange={(event) => {
          const selected = classes.find((item) => item.id === event.target.value);
          setClassId(event.target.value);
          if (selected?.week) setWeekId(selected.week);
        }}>
          <option value="">{weekly ? "Sin clase relacionada" : "Consulta general del curso"}</option>
          {classes.filter((item) => !weekly || !weekId || item.week === weekId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </Select>
      </Field>
      <Field id="inquiry-description" label="Descripción" required>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="w-full resize-y rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" />
      </Field>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" isPending={isLoading} pendingLabel="Creando…" disabled={!title.trim() || !description.trim() || (weekly && !weekId)} leadingIcon={<span className="material-symbols-outlined text-lg">send</span>}>Crear consulta</Button>
      </div>
    </form>
  );
}
