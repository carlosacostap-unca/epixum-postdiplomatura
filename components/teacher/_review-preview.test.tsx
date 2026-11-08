import { it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import ReviewWorkspace from './ReviewWorkspace';
import DeliveryMaterial from './DeliveryMaterial';
import AIPreevaluationClient from '@/app/assignments/[id]/deliveries/[deliveryId]/AIPreevaluationClient';
import { Badge, Breadcrumbs, Card, CardContent, PageHeader, ToastProvider } from '@/components/ui';
import type { Delivery } from '@/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/actions', () => ({ updateDeliveryEvaluation: vi.fn(), getTeacherDeliveryFileDownloadUrl: vi.fn(), getDeliveryDownloadUrl: vi.fn() }));
vi.mock('@/app/actions/openai', () => ({ requestAIPreevaluation: vi.fn() }));

it('genera una muestra visual local con los componentes reales', () => {
  const delivery = { id: 'delivery0000001', assignment: 'assignment-1', status: 'pending', created: '2026-09-01', submissionVersion: 2, resubmissionCount: 1, evaluatedVersion: 1, repositoryUrl: JSON.stringify([{ name: 'Informe final.pdf', url: 'https://example.invalid/private' }, { name: 'Análisis de resultados.docx', url: 'https://example.invalid/private-2' }]), history: [{ version: 1, submittedAt: '2026-09-01T10:00:00Z', contentUnavailable: true, evaluation: { verdict: 'Corregir y reenviar', feedback: 'Ampliá la justificación de los resultados y agregá las fuentes consultadas.' } }] } as Delivery;
  const markup = renderToStaticMarkup(<ToastProvider>
    <div className="content-shell flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-variant)] p-6 lg:block"><p className="text-xl font-bold">epixum.</p><p className="mt-8 text-sm text-[var(--color-on-surface-variant)]">Docencia</p><p className="mt-5 text-sm">Inicio</p><p className="mt-5 text-sm">Mis cursos</p><p className="mt-5 text-sm">Clases</p></aside>
      <main className="min-w-0 flex-1"><header className="sticky top-0 z-40 min-h-16 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-variant)] px-6 py-4 text-sm">Tu espacio de docencia</header>
      <div className="page-container space-y-6"><ReviewWorkspace backHref="#entregas" previous={{ href: '#anterior', student: 'Lucía' }} next={{ href: '#siguiente', student: 'Martín' }} position={2} total={18} filtered>
      <Breadcrumbs items={[{ href: '#curso', label: 'Pensamiento crítico e IA' }, { href: '#trabajo', label: 'Trabajo integrador' }, { label: 'Ana Pérez' }]} />
      <PageHeader eyebrow="Revisión docente" title="Ana Pérez" description="Trabajo integrador" metadata={<><Badge tone="warning">Reenviado</Badge><Badge>Versión 2</Badge></>} />
      <AIPreevaluationClient deliveryId={delivery.id} submissionVersion={2} aiEligible={false} initialAttempt={null} providerStatus={{ openaiConfigured: false, githubTokenConfigured: false, githubPublicAccessAvailable: true }} initialFeedback="La estructura del informe es clara. Revisá la relación entre los datos y las conclusiones para que la argumentación quede completa." initialVerdict="Corregir y reenviar" initialStatus="draft" submission={<Card><CardContent className="space-y-6"><div><p className="font-bold">Ana Pérez</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">ana.perez@example.invalid · Versión 2</p></div><DeliveryMaterial delivery={delivery} /></CardContent></Card>} />
      </ReviewWorkspace></div></main></div>
  </ToastProvider>);
  mkdirSync('output/playwright/teacher-review', { recursive: true });
  writeFileSync('output/playwright/teacher-review/index.html', `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--font-inter:Arial;--font-outfit:Arial;--font-manrope:Arial}.material-symbols-outlined{font-family:Arial;font-size:0!important}.material-symbols-outlined::after{content:'›';font-size:18px}</style><title>Vista de corrección docente</title></head><body>${markup}</body></html>`);
});
