'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CourseContent } from '@/types';
import RichTextEditor from '@/components/RichTextEditor';
import { Button, useToast } from '@/components/ui';
import { createCourseContent, updateCourseContent } from '@/lib/actions-course-content';

export function CourseContentForm({ courseId, content }: { courseId: string; content?: CourseContent }) {
  const router = useRouter();
  const { notify } = useToast();
  const [description, setDescription] = useState(content?.description || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('description', description);
    const result = content
      ? await updateCourseContent(courseId, content.id, formData)
      : await createCourseContent(courseId, formData);
    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }
    notify({ title: content ? 'Contenido actualizado' : 'Contenido creado', tone: 'success' });
    router.push(`/docentes/cursos/${courseId}/contenidos/${result.contentId}`);
    router.refresh();
  };

  return <form onSubmit={submit} className="space-y-6">
    <div><label htmlFor="content-title" className="mb-2 block text-sm font-bold">Título</label><input id="content-title" name="title" required maxLength={160} defaultValue={content?.title} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" /></div>
    <div><label className="mb-2 block text-sm font-bold">Descripción</label><div className="overflow-hidden rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)]"><RichTextEditor content={description} onChange={setDescription} /></div></div>
    {error ? <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-4 text-sm font-medium text-[var(--color-error)]">{error}</p> : null}
    <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><Link href={`/docentes/cursos/${courseId}/contenidos${content ? `/${content.id}` : ''}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold">Cancelar</Link><Button type="submit" isPending={pending} pendingLabel="Guardando…">{content ? 'Guardar cambios' : 'Crear contenido'}</Button></div>
  </form>;
}
