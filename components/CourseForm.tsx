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
          <option value="semanal">Por semanas · estructura administrada por los docentes</option>
        </select>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Cambiar la modalidad no crea ni elimina contenido. La organización semanal existente se conserva si después volvés a activarla.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div>
          <label htmlFor="classes" className={labelClass}>Clases</label>
          <select
            id="classes"
            name="classes"
            multiple
            defaultValue={course?.classes || []}
            className={`${inputClass} h-32`}
          >
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mantén presionado Ctrl o Cmd para seleccionar múltiples</p>
        </div>

        <div>
          <label htmlFor="assignments" className={labelClass}>Trabajos Prácticos</label>
          <select
            id="assignments"
            name="assignments"
            multiple
            defaultValue={course?.assignments || []}
            className={`${inputClass} h-32`}
          >
            {availableAssignments.map(assignment => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mantén presionado Ctrl o Cmd para seleccionar múltiples</p>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <label htmlFor="inquiries" className={labelClass}>Consultas</label>
        <select
          id="inquiries"
          name="inquiries"
          multiple
          defaultValue={course?.inquiries || []}
          className={`${inputClass} h-32 md:w-1/2`}
        >
          {availableInquiries.map(inquiry => (
            <option key={inquiry.id} value={inquiry.id}>
              {inquiry.title || 'Sin título'}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mantén presionado Ctrl o Cmd para seleccionar múltiples</p>
      </div>

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
