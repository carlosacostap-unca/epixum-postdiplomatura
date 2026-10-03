'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Class, Assignment, Inquiry } from '@/types';
import { createCourse, updateCourse } from '@/lib/actions-courses';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';
import { Button, useToast } from '@/components/ui';

interface CourseFormProps {
  course?: Course;
  availableClasses: Class[];
  availableAssignments: Assignment[];
  availableInquiries: Inquiry[];
}

function ContentSelection({ label, name, items, selected = [] }: { label: string; name: string; items: { id: string; title: string }[]; selected?: string[] }) {
  return <fieldset className="min-w-0 space-y-3">
    <legend className="text-sm font-semibold">{label}</legend>
    {items.length ? <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--epixum-radius-md)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-2">{items.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3 text-sm hover:bg-[var(--color-surface-container)]"><input type="checkbox" name={name} value={item.id} defaultChecked={selected.includes(item.id)} className="mt-0.5 size-5 shrink-0" /><span>{item.title || "Sin título"}</span></label>)}</div> : <p className="rounded-xl bg-[var(--color-surface-container-lowest)] p-4 text-sm text-[var(--color-text-muted)]">Todavía no hay {label.toLocaleLowerCase("es")} para vincular.</p>}
    {items.length > 0 && <p className="text-xs text-[var(--color-text-muted)]">Marcá los elementos que pertenecen a este curso.</p>}
  </fieldset>;
}

export default function CourseForm({ 
  course, 
  availableClasses, 
  availableAssignments, 
  availableInquiries 
}: CourseFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  
  // Usar estado para la descripción del RichTextEditor
  const [description, setDescription] = useState(course?.description || '');
  const isEdit = !!course;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    // Asegurarse de inyectar la descripción del editor en el form data
    formData.set('description', description);

    try {
      if (isEdit) {
        const result = await updateCourse(course.id, formData);
        if (!result.success) throw new Error(result.error);
        notify({ title: 'Curso actualizado', description: 'Los cambios ya están visibles.', tone: 'success' });
        router.push(`/admin/courses/${course.id}`);
      } else {
        const created = await createCourse(formData);
        notify({ title: 'Curso creado', description: 'El nuevo curso ya figura en el catálogo.', tone: 'success' });
        router.push(`/admin/courses/${created.id}/participants`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el curso');
      setLoading(false);
      requestAnimationFrame(() => {
        feedbackRef.current?.focus();
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const inputClass = "mt-1 block w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-text-muted)]";
  const labelClass = "mb-1 block text-sm font-bold text-[var(--color-on-surface)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
      <div>
        <label htmlFor="title" className={labelClass}>Título del Curso *</label>
        <input
          type="text"
          id="title"
          name="title"
          required
          defaultValue={course?.title}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <div className="overflow-hidden rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)]">
          <RichTextEditor 
            content={description} 
            onChange={setDescription} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="startDate" className={labelClass}>Fecha de Inicio</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            defaultValue={course?.startDate ? new Date(course.startDate).toISOString().split('T')[0] : ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="endDate" className={labelClass}>Fecha de Finalización</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            defaultValue={course?.endDate ? new Date(course.endDate).toISOString().split('T')[0] : ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>Estado</label>
          <select
            id="status"
            name="status"
            defaultValue={course?.status || 'borrador'}
            className={inputClass}
          >
            <option value="borrador">Borrador</option>
            <option value="en curso">En Curso</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      <div className="rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <label htmlFor="organizationMode" className={labelClass}>Organización del curso</label>
        <select
          id="organizationMode"
          name="organizationMode"
          defaultValue={course?.organizationMode || 'tradicional'}
          className={inputClass}
        >
          <option value="tradicional">Tradicional · listas de clases, trabajos y consultas</option>
          <option value="semanal">Por unidades · estructura administrada por los docentes</option>
        </select>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Cambiar la modalidad no crea ni elimina contenido. La organización por unidades existente se conserva si después volvés a activarla.
        </p>
      </div>

      <div className="rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <label className="flex cursor-pointer items-start gap-3" htmlFor="aiPreevaluationEnabled">
          <input
            type="checkbox"
            id="aiPreevaluationEnabled"
            name="aiPreevaluationEnabled"
            value="true"
            defaultChecked={course?.aiPreevaluationEnabled ?? false}
            className="mt-1 size-5 rounded border-[var(--color-outline)] text-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-bold text-[var(--color-on-surface)]">Habilitar preevaluación asistida por IA</span>
            <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">
              Los docentes podrán configurar cada TP para analizar entregas de repositorios públicos de GitHub. Deshabilitarla conserva configuraciones e intentos previos.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <label className="flex cursor-pointer items-start gap-3" htmlFor="contentsEnabled">
          <input
            type="checkbox"
            id="contentsEnabled"
            name="contentsEnabled"
            value="true"
            defaultChecked={course?.contentsEnabled ?? false}
            className="mt-1 size-5 rounded border-[var(--color-outline)] text-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-bold text-[var(--color-on-surface)]">Habilitar contenidos</span>
            <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">
              Añade una sección independiente para materiales ordenados manualmente. Si la deshabilitás, los contenidos y sus recursos se conservan ocultos hasta volver a activarla.
            </span>
          </span>
        </label>
      </div>

      <section className="space-y-5 border-t border-[var(--color-outline-variant)] pt-5" aria-labelledby="course-links-title">
        <div className="rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
          <label className="flex cursor-pointer items-start gap-3" htmlFor="interactiveClassesEnabled">
            <input type="checkbox" id="interactiveClassesEnabled" name="interactiveClassesEnabled" value="true" defaultChecked={course?.interactiveClassesEnabled ?? false} className="mt-1 size-5 rounded border-[var(--color-outline)] text-[var(--color-primary)]" />
            <span>
              <span className="block text-sm font-bold">Habilitar clases interactivas</span>
              <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">Los docentes podrán preparar pantallas y actividades y asociarlas a las clases del curso. Al deshabilitar, los materiales se conservan y quedan ocultos.</span>
            </span>
          </label>
        </div>

        <div><h2 id="course-links-title" className="font-headline text-lg font-bold">Contenido vinculado</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Seleccioná las clases, trabajos y consultas que pertenecen al curso.</p></div>
        <div className="grid gap-5 xl:grid-cols-2">
          <ContentSelection label="Clases" name="classes" items={availableClasses} selected={course?.classes} />
          <ContentSelection label="Trabajos prácticos" name="assignments" items={availableAssignments} selected={course?.assignments} />
          <ContentSelection label="Consultas" name="inquiries" items={availableInquiries} selected={course?.inquiries} />
        </div>
      </section>

      <div className="flex flex-col-reverse justify-end gap-3 pt-6 sm:flex-row">
        {error && (
          <div
            ref={feedbackRef}
            className="w-full rounded-[var(--epixum-radius-md)] bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] p-4 text-sm font-medium text-[var(--color-error)] sm:mr-auto sm:w-auto sm:flex-1"
            role="alert"
            tabIndex={-1}
          >
            {error}
          </div>
        )}
        <Link
          href="/admin/courses"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold text-[var(--color-on-surface)]"
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          isPending={loading}
          pendingLabel="Guardando…"
        >
          {isEdit ? 'Actualizar curso' : 'Crear curso'}
        </Button>
      </div>
    </form>
  );
}
