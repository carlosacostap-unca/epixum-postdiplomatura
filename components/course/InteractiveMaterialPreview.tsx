'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { InteractiveMaterial, InteractiveScreen } from '@/lib/interactive-material';
import { screenTypeLabels } from '@/lib/interactive-material';
import { Badge, Button, Card, CardContent } from '@/components/ui';

function PreviewScreen({ screen }: { screen: InteractiveScreen }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const choice = screen.type === 'multiple-choice' || screen.type === 'poll';
  return <div className="space-y-6">
    <div>
      <Badge>{screenTypeLabels[screen.type]}</Badge>
      <h3 className="mt-4 font-headline text-2xl font-bold md:text-3xl">{screen.title}</h3>
    </div>
    {screen.body && <div className="reading-content prose prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{screen.body}</ReactMarkdown>
    </div>}
    {screen.type !== 'content' && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (answer.trim()) setSubmitted(true); }}>
      {choice && <fieldset className="space-y-3" disabled={submitted}>
        <legend className="mb-3 text-sm font-semibold">Elegí una opción</legend>
        {screen.options.map((option) => <label key={option.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
          <input type="radio" name={`preview-${screen.id}`} value={option.id} checked={answer === option.id} onChange={() => setAnswer(option.id)} className="size-5 shrink-0" required />
          <span className="break-words">{option.label}</span>
        </label>)}
      </fieldset>}
      {screen.type === 'short-answer' && <div>
        <label htmlFor={`answer-${screen.id}`} className="mb-2 block text-sm font-semibold">Tu respuesta</label>
        <textarea id={`answer-${screen.id}`} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={screen.maxLength} disabled={submitted} rows={4} required className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" />
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{answer.length} / {screen.maxLength} caracteres</p>
      </div>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!answer.trim() || submitted}>Probar respuesta</Button>
        {submitted && <Button type="button" variant="secondary" onClick={() => { setAnswer(''); setSubmitted(false); }}>Volver a probar</Button>}
      </div>
      {submitted && <div role="status" className="rounded-xl bg-[var(--color-surface-container-high)] p-4">
        {screen.type === 'multiple-choice' ? <><p className="font-bold">{answer === screen.correctOptionId ? 'Respuesta correcta' : 'Revisá tu respuesta'}</p><p className="mt-1">La opción correcta es: {screen.options.find((option) => option.id === screen.correctOptionId)?.label}.</p>{screen.explanation && <p className="mt-2">{screen.explanation}</p>}</> : <p>Respuesta de prueba recibida. No se guardó ningún dato.</p>}
      </div>}
    </form>}
  </div>;
}

export function InteractiveMaterialPreview({ material }: { material: InteractiveMaterial }) {
  const [index, setIndex] = useState(0);
  const currentIndex = Math.min(index, material.screens.length - 1);
  const screen = material.screens[currentIndex];
  return <section aria-label="Vista previa del material" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-headline text-xl font-bold">Vista previa</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Solo para docentes. Las respuestas de prueba no se guardan.</p></div>
      <p aria-live="polite" className="text-sm font-semibold">Pantalla {currentIndex + 1} de {material.screens.length}</p>
    </div>
    <Card><CardContent className="min-h-72"><PreviewScreen key={screen.id + currentIndex} screen={screen} /></CardContent></Card>
    <nav aria-label="Pantallas de la vista previa" className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)}>Anterior</Button>
      <Button disabled={currentIndex === material.screens.length - 1} onClick={() => setIndex(currentIndex + 1)}>Siguiente</Button>
    </nav>
  </section>;
}
