'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { InteractiveScreen } from '@/lib/interactive-material';
import { Badge, Card, CardContent } from '@/components/ui';
import { ContentWindow } from './ContentWindow';

function ScriptContent({ screen, index, total, detached = false }: { screen: InteractiveScreen; index: number; total: number; detached?: boolean }) {
  const start = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Only the private popup scrolls on a slide change, never the control panel.
    if (detached) start.current?.scrollIntoView?.({ block: 'start' });
  }, [screen.id, detached]);
  return <div ref={start} className="space-y-4">
    <Badge>Guion privado · sólo docentes</Badge>
    <p className="text-sm text-[var(--color-text-muted)]">Pantalla {index + 1} de {total}</p>
    <h3 className="font-headline text-xl font-bold">{screen.title}</h3>
    {screen.teacherNotes?.trim() ? <div className="reading-content prose prose-invert max-w-none break-words text-lg leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{screen.teacherNotes}</ReactMarkdown></div> : <p className="text-[var(--color-text-muted)]">Esta pantalla todavía no tiene guion docente.</p>}
  </div>;
}

/** Render only within an authorized teacher view, never inside projection. */
export function TeacherScript({ screen, index, total, title }: { screen: InteractiveScreen; index: number; total: number; title: string }) {
  return <Card><CardContent className="space-y-4">
    <h2 className="font-headline text-xl font-bold">Guion docente</h2>
    <ContentWindow title={title} mode="notes"><ScriptContent screen={screen} index={index} total={total} detached /></ContentWindow>
    <details open><summary className="cursor-pointer py-2 font-semibold">Guion de la pantalla actual</summary><ScriptContent screen={screen} index={index} total={total} /></details>
  </CardContent></Card>;
}
