'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Class, InteractiveLesson } from '@/types';
import { saveInteractiveLesson } from '@/lib/actions-interactive-classes';
import { inspectInteractiveMaterial, isInteractiveLessonReady, MAX_MATERIAL_BYTES, parseInteractiveMaterial, type InteractiveMaterial } from '@/lib/interactive-material';
import { Button, useToast } from '@/components/ui';
import { InteractiveMaterialPreview } from './InteractiveMaterialPreview';

const inputClass = 'w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3';
const labelClass = 'mb-2 block text-sm font-bold';

export function InteractiveLessonForm({ courseId, classes, lesson, initialClassId = '' }: { courseId: string; classes: Class[]; lesson?: InteractiveLesson; initialClassId?: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const initial = inspectInteractiveMaterial(lesson?.material);
  const [material, setMaterial] = useState<InteractiveMaterial | null>(initial.material);
  const [materialError, setMaterialError] = useState<string | null>(initial.error);
  const [fileName, setFileName] = useState(initial.material ? 'Material guardado' : '');
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const base = `/docentes/cursos/${courseId}/interactivas`;

  async function importFile(file?: File) {
    if (!file) return;
    setReading(true);
    setMaterialError(null);
    try {
      if (file.size > MAX_MATERIAL_BYTES) throw new Error('El archivo supera los 200 KB.');
      const parsed = parseInteractiveMaterial(await file.text());
      if (!parsed) throw new Error('El archivo no contiene pantallas.');
      setMaterial(parsed);
      setFileName(file.name);
    } catch (error) {
      setMaterialError(`${error instanceof Error ? error.message : 'No pudimos leer el archivo.'} Se conservó el material anterior.`);
    } finally { setReading(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    data.delete('materialFile');
    data.set('material', material ? JSON.stringify(material) : '');
    try {
      const result = await saveInteractiveLesson(courseId, lesson?.id ?? null, data);
      if (!result.success) throw new Error(result.error);
      notify({ title: lesson ? 'Clase interactiva actualizada' : 'Clase interactiva creada', tone: 'success' });
      router.push(`${base}/${result.lessonId}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar los cambios. Intentá nuevamente.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setPending(false); }
  }

  return <div className="space-y-8">
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={pending} className="space-y-6">
        <div><label htmlFor="interactive-title" className={labelClass}>Título</label><input id="interactive-title" name="title" defaultValue={lesson?.title} required maxLength={160} className={inputClass} /></div>
        <div><label htmlFor="interactive-description" className={labelClass}>Descripción (opcional)</label><textarea id="interactive-description" name="description" defaultValue={lesson?.description} maxLength={2000} rows={3} className={inputClass} /></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div><label htmlFor="interactive-class" className={labelClass}>Clase habitual asociada</label><select id="interactive-class" name="class" defaultValue={lesson?.class || initialClassId} className={inputClass}>
            <option value="">Asociar más adelante</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select><p className="mt-2 text-sm text-[var(--color-text-muted)]">{classes.length ? 'Podés cambiar la asociación por otra clase de este curso.' : 'Todavía no hay clases en este curso. Podés guardar un borrador.'}</p></div>
          <div><label htmlFor="interactive-status" className={labelClass}>Estado de preparación</label><select id="interactive-status" name="status" defaultValue={lesson && isInteractiveLessonReady(lesson) ? 'ready' : 'draft'} className={inputClass}>
            <option value="draft">Borrador</option><option value="ready">Preparada</option>
          </select><p className="mt-2 text-sm text-[var(--color-text-muted)]">Para marcarla como preparada, importá un material y asociá una clase. Todavía no será visible para alumnos.</p></div>
        </div>
        <section aria-labelledby="material-heading" className="space-y-4 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
          <div><h2 id="material-heading" className="font-headline text-xl font-bold">Material interactivo</h2><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Importá el archivo de la clase preparado con ayuda de Codex. Puede incluir contenido, opción múltiple, encuestas y respuestas breves.</p></div>
          <div><label htmlFor="interactive-file" className={labelClass}>Importar material</label><input type="file" id="interactive-file" name="materialFile" accept=".json,application/json" disabled={reading} onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ''; }} className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-[var(--color-surface-container-highest)] file:px-4 file:font-bold file:text-[var(--color-on-surface)]" /><p className="mt-2 text-sm text-[var(--color-text-muted)]">Archivo de material (.json), hasta 200 KB y 80 pantallas.</p></div>
          <a href="/interactive-class-example.json" download className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">Descargar material de ejemplo</a>
          <div role="status" className="text-sm">{reading ? 'Leyendo material…' : material ? `${fileName} · ${material.screens.length} pantallas` : 'Todavía no importaste un material.'}</div>
          {materialError && <p role="alert" className="text-sm text-[var(--color-error)]">{materialError}</p>}
          {(material || materialError) && <Button type="button" variant="ghost" disabled={reading} onClick={() => { setMaterial(null); setFileName(''); setMaterialError(null); }}>Quitar material</Button>}
        </section>
      </fieldset>
      {error && <p role="alert" tabIndex={-1} ref={errorRef} className="rounded-xl bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{error}</p>}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Link href={lesson ? `${base}/${lesson.id}` : base} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] px-5 font-bold">Cancelar</Link>
        <Button type="submit" isPending={pending} disabled={reading || Boolean(materialError)} pendingLabel="Guardando…">{lesson ? 'Guardar cambios' : 'Crear clase interactiva'}</Button>
      </div>
    </form>
    {material && <InteractiveMaterialPreview key={JSON.stringify(material)} material={material} />}
  </div>;
}
