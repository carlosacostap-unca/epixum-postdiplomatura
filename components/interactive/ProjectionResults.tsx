import type { LiveProjectionResults, PublicScreen } from '@/lib/live-interactive-contract';

export function ProjectionResults({ screen, results, participants, open }: {
  screen: PublicScreen; results: LiveProjectionResults; participants: number; open: boolean;
}) {
  if (!('options' in screen) || results.screenId !== screen.id) return null;
  return <section aria-label="Resultados de la pregunta" className="mt-6 space-y-4">
    <div aria-live="polite" aria-atomic="true">
      <h3 className="text-xl font-bold">{open ? 'Respuestas en vivo' : 'Resultados de la pregunta'}</h3>
      <p className="text-[var(--color-text-muted)]">{results.total} de {participants} participantes respondieron.</p>
    </div>
    <ul className="space-y-3">{screen.options.map((option) => {
      const count = results.counts[option.id] ?? 0;
      const percent = results.total ? Math.round(count / results.total * 100) : 0;
      return <li key={option.id} className="space-y-2 rounded-xl border border-[var(--color-outline-variant)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="min-w-0 break-words font-semibold">{option.label}</span>
          <span className="shrink-0 font-bold tabular-nums">{count} {count === 1 ? 'respuesta' : 'respuestas'} · {percent} %</span>
        </div>
        <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-[var(--color-surface-container-highest)]">
          <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
      </li>;
    })}</ul>
    <p className="text-sm text-[var(--color-text-muted)]">{results.total === 0 ? 'Todavía no llegaron respuestas. ' : ''}Porcentajes sobre las respuestas recibidas, redondeados al entero más cercano.</p>
  </section>;
}
