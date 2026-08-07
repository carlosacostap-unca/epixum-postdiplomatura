'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Course, User, Class, Assignment, Inquiry, CourseEnrollmentMode } from '@/types';
import { createCourse, updateCourse } from '@/lib/actions-courses';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';
import { Button, useToast } from '@/components/ui';

interface CourseFormProps {
  course?: Course;
  teachers: User[];
  availableClasses: Class[];
  availableAssignments: Assignment[];
  availableInquiries: Inquiry[];
}

export default function CourseForm({ 
  course, 
  teachers, 
  availableClasses, 
  availableAssignments, 
  availableInquiries 
}: CourseFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Usar estado para la descripción del RichTextEditor
  const [description, setDescription] = useState(course?.description || '');
  const [enrollmentMode, setEnrollmentMode] = useState<CourseEnrollmentMode>(course?.enrollmentMode || 'clave');

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
        await updateCourse(course.id, formData);
        notify({ title: 'Curso actualizado', description: 'Los cambios ya están visibles.', tone: 'success' });
        router.push('/admin/courses');
      } else {
        await createCourse(formData);
        notify({ title: 'Curso creado', description: 'El nuevo curso ya figura en el catálogo.', tone: 'success' });
        router.push('/admin/courses');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el curso');
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-text-muted)]";
  const labelClass = "mb-1 block text-sm font-bold text-[var(--color-on-surface)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8" noValidate>
      {error && (
        <div className="rounded-[var(--epixum-radius-md)] bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] p-4 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </div>
      )}

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
        <label htmlFor="enrollmentMode" className={labelClass}>Modalidad de matrícula</label>
        <select
          id="enrollmentMode"
          name="enrollmentMode"
          value={enrollmentMode}
          onChange={(event) => setEnrollmentMode(event.target.value as CourseEnrollmentMode)}
          className={inputClass}
        >
          <option value="clave">Clave compartida · matrícula inmediata</option>
          <option value="invitacion_contrasena">Email autorizado + contraseña · doble validación</option>
        </select>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Cambiar la modalidad no elimina matrículas ni invitaciones. En doble validación, los administradores cargan los emails y la comunicación se realiza fuera de Epixum.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div>
          <label htmlFor="teachers" className={labelClass}>Docentes Asignados</label>
          <select
            id="teachers"
            name="teachers"
            multiple
            defaultValue={course?.teachers || []}
            className={`${inputClass} h-32`}
          >
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name || teacher.username} {teacher.role === 'admin' ? '(Admin)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mantén presionado Ctrl o Cmd para seleccionar múltiples</p>
        </div>

        <div>
          <label htmlFor={enrollmentMode === 'clave' ? 'enrollmentKey' : 'invitationPassword'} className={labelClass}>
            {enrollmentMode === 'clave' ? 'Clave de matriculación' : 'Contraseña compartida del curso'}
          </label>
          {enrollmentMode === 'clave' ? <>
            <input
              type="text"
              id="enrollmentKey"
              name="enrollmentKey"
              minLength={6}
              maxLength={64}
              autoComplete="off"
              placeholder={isEdit ? "Dejala vacía para conservar la clave actual" : "Ej.: EPIXUM-2026"}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Los estudiantes que ingresen esta clave quedarán matriculados inmediatamente.
            </p>
          </> : <>
            <input
              type="password"
              id="invitationPassword"
              name="invitationPassword"
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              placeholder={isEdit ? "Dejala vacía para conservar la contraseña actual" : "Entre 8 y 64 caracteres"}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Distingue mayúsculas y minúsculas. Sólo los emails cargados por un administrador podrán utilizarla.
            </p>
          </>}
        </div>
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
