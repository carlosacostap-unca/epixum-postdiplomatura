'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { requestAIPreevaluation } from '@/app/actions/openai';
import { updateDeliveryEvaluation } from '@/lib/actions';
import type { AIPreevaluationDTO } from '@/lib/ai-preevaluation-service';
import type { AIVerdict } from '@/types';
import { Badge, Button, Card, CardContent, ConfirmDialog, Field, Select, useToast } from '@/components/ui';

interface Props {
  deliveryId: string;
  aiEligible: boolean;
  repositoryUrl?: string;
  repositoryFullName?: string;
  commitSha?: string;
  captureSource?: 'student-submission' | 'student-update' | 'legacy-first-evaluation';
  providerStatus: { openaiConfigured: boolean; githubTokenConfigured: boolean; githubPublicAccessAvailable: boolean };
  initialAttempt: AIPreevaluationDTO | null;
  initialGrade?: number | null;
  initialFeedback?: string;
  initialVerdict?: AIVerdict;
  initialStatus?: 'pending' | 'draft' | 'published';
}

const sourceCopy = {
  'student-submission': 'capturado al entregar',
  'student-update': 'capturado al actualizar la entrega',
  'legacy-first-evaluation': 'capturado al solicitar la primera preevaluación',
};

export default function AIPreevaluationClient(props: Props) {
  const [attempt, setAttempt] = useState(props.initialAttempt);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(props.initialFeedback || props.initialAttempt?.result?.proposedMessage || '');
  const [grade, setGrade] = useState(props.initialGrade !== null && props.initialGrade !== undefined
    ? String(props.initialGrade)
    : props.initialAttempt?.result?.suggestedGrade !== null && props.initialAttempt?.result?.suggestedGrade !== undefined
      ? String(props.initialAttempt.result.suggestedGrade)
      : '');
  const [verdict, setVerdict] = useState<AIVerdict | ''>(props.initialVerdict || props.initialAttempt?.result?.verdict || '');
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const { notify } = useToast();

  async function preevaluate() {
    setProcessing(true);
    setError('');
    const result = await requestAIPreevaluation(props.deliveryId);
    setProcessing(false);
    if (!result.success) {
      setError(result.error);
      if (result.attempt) setAttempt(result.attempt);
      return;
    }
    setAttempt(result.attempt);
    if (result.attempt.result) {
      setFeedback(result.attempt.result.proposedMessage);
      setGrade(result.attempt.result.suggestedGrade === null ? '' : String(result.attempt.result.suggestedGrade));
      setVerdict(result.attempt.result.verdict);
    }
  }

  async function save(status: 'draft' | 'published') {
    if (status === 'published' && (!feedback.trim() || !verdict)) {
      setError('Para publicar, completá la devolución y seleccioná un veredicto.');
      setConfirmPublish(false);
      return;
    }
    const numericGrade = grade.trim() === '' ? null : Number(grade);
    if (numericGrade !== null && !Number.isFinite(numericGrade)) { setError('La nota debe ser un número o quedar vacía.'); return; }
    setSaving(status);
    setError('');
    const result = await updateDeliveryEvaluation(props.deliveryId, numericGrade, feedback.trim(), verdict || undefined, status, attempt?.status === 'completed' ? attempt.id : undefined);
    setSaving(null);
    setConfirmPublish(false);
    if (!result.success) { setError(result.error || 'No se pudo guardar la evaluación.'); return; }
    if (attempt?.status === 'completed') setAttempt({ ...attempt, adoptedAt: new Date().toISOString(), adoptedAs: status });
    notify(status === 'published' ? { title: 'Evaluación publicada', tone: 'success' } : { title: 'Borrador guardado', tone: 'info' });
  }

  const effectiveCommit = attempt?.commitSha || props.commitSha;
  const effectiveSource = attempt?.captureSource || props.captureSource;

  return <div className="mt-8 space-y-8 border-t border-[var(--color-outline-variant)] pt-8">
    {props.aiEligible && <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><h2 className="font-headline text-2xl font-bold">Sugerencia de preevaluación con IA</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Analiza el commit capturado sin ejecutar el código. El docente conserva la decisión final.</p></div>
          <Badge tone={attempt?.status === 'completed' ? 'success' : attempt?.status === 'failed' ? 'error' : attempt?.status === 'processing' ? 'warning' : 'neutral'}>{attempt?.status === 'completed' ? 'Lista para revisar' : attempt?.status === 'failed' ? 'Fallida' : attempt?.status === 'processing' ? 'Procesando' : 'Sin solicitar'}</Badge>
        </div>

        <div className="grid gap-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-2">
          <p><span className="font-bold">Repositorio:</span> {props.repositoryFullName || props.repositoryUrl}</p>
          <p><span className="font-bold">Commit:</span> <code>{effectiveCommit ? effectiveCommit.slice(0, 12) : 'se capturará al solicitar'}</code></p>
          {effectiveSource && <p className="sm:col-span-2 text-[var(--color-on-surface-variant)]">Origen: {sourceCopy[effectiveSource]}.</p>}
        </div>
        {effectiveSource === 'legacy-first-evaluation' && <p className="rounded-[var(--epixum-radius-md)] bg-[var(--color-warning)]/10 p-4 text-sm">Advertencia: esta entrega era heredada. El commit se fijó al iniciar la primera preevaluación y puede no coincidir con el estado original de la fecha de entrega.</p>}
        {!props.providerStatus.openaiConfigured && <p role="status" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">OpenAI no está configurado en el servidor. La evaluación manual sigue disponible.</p>}
        {!props.providerStatus.githubTokenConfigured && <p className="text-sm text-[var(--color-on-surface-variant)]">GitHub se consultará sin token; el piloto puede encontrar límites compartidos más bajos.</p>}
        {(error || attempt?.errorMessage) && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{error || attempt?.errorMessage}</p>}
        <Button onClick={preevaluate} isPending={processing} pendingLabel="Analizando repositorio…" disabled={!props.providerStatus.openaiConfigured} leadingIcon={<span className="material-symbols-outlined">auto_awesome</span>}>{attempt ? 'Solicitar nueva preevaluación' : 'Solicitar preevaluación con IA'}</Button>

        {attempt?.coverage && <section className="space-y-3"><h3 className="font-bold">Cobertura analizada</h3><div className="grid gap-3 text-sm sm:grid-cols-3"><p><span className="font-bold">Archivos incluidos:</span> {attempt.coverage.includedFiles.length}</p><p><span className="font-bold">Omitidos:</span> {attempt.coverage.omittedFiles.length}</p><p><span className="font-bold">Texto enviado:</span> {Math.ceil(attempt.coverage.includedBytes / 1024)} KiB</p></div>{attempt.coverage.partial && <details><summary className="cursor-pointer text-sm font-bold">Ver archivos omitidos</summary><ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-[var(--color-on-surface-variant)]">{attempt.coverage.omittedFiles.map((item) => <li key={`${item.path}-${item.reason}`}><code>{item.path}</code>: {item.reason}</li>)}</ul></details>}</section>}

        {attempt?.result && <section className="space-y-5 border-t border-[var(--color-outline-variant)] pt-5">
          <div className="flex flex-wrap gap-3"><Badge tone={attempt.result.verdict === 'Aprobado' ? 'success' : attempt.result.verdict === 'Desaprobado' ? 'error' : 'warning'}>{attempt.result.verdict}</Badge>{attempt.result.suggestedGrade !== null && <Badge tone="info">Nota sugerida: {attempt.result.suggestedGrade}</Badge>}<Badge>Modelo {attempt.model}</Badge></div>
          <div><h3 className="font-bold">Resultados por criterio</h3><div className="mt-3 space-y-3">{attempt.result.criteria.map((criterion) => <article key={criterion.criterionId} className="rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-high)] p-4"><p className="font-bold">{criterion.criterion} · {criterion.outcome.replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{criterion.observation}</p></article>)}</div></div>
          {attempt.result.strengths.length > 0 && <div><h3 className="font-bold">Fortalezas</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{attempt.result.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {attempt.result.corrections.length > 0 && <div><h3 className="font-bold">Correcciones necesarias</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{attempt.result.corrections.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {attempt.result.warnings.length > 0 && <div><h3 className="font-bold">Advertencias</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{attempt.result.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div><h3 className="font-bold">Mensaje propuesto</h3><div className="prose mt-2 max-w-none rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-high)] p-4 text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{attempt.result.proposedMessage}</ReactMarkdown></div></div>
          <Button variant="ghost" onClick={() => { setAttempt(null); setFeedback(props.initialFeedback || ''); setGrade(props.initialGrade === null || props.initialGrade === undefined ? '' : String(props.initialGrade)); setVerdict(props.initialVerdict || ''); }}>Descartar sugerencia</Button>
          {attempt.adoptedAt && <p className="text-sm text-[var(--color-on-surface-variant)]">Esta sugerencia fue adoptada como {attempt.adoptedAs === 'published' ? 'evaluación publicada' : 'borrador'}.</p>}
        </section>}
      </CardContent>
    </Card>}

    <Card><CardContent className="space-y-5">
      <div><h2 className="font-headline text-2xl font-bold">Evaluación oficial</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Podés evaluar manualmente o editar la sugerencia. Nada se publica sin tu confirmación.</p></div>
      {error && !props.aiEligible && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]"><Field label="Nota opcional" id="official-grade"><input id="official-grade" type="number" value={grade} onChange={(event) => setGrade(event.target.value)} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" /></Field><Field label="Veredicto" id="official-verdict"><Select id="official-verdict" value={verdict} onChange={(event) => setVerdict(event.target.value as AIVerdict | '')}><option value="">Seleccionar</option><option value="Aprobado">Aprobado</option><option value="Desaprobado">Desaprobado</option><option value="Corregir y reenviar">Corregir y reenviar</option></Select></Field></div>
      <Field label="Devolución para el estudiante" id="official-feedback"><textarea id="official-feedback" rows={8} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /></Field>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => save('draft')} isPending={saving === 'draft'} pendingLabel="Guardando…">Guardar borrador</Button><Button onClick={() => setConfirmPublish(true)} isPending={saving === 'published'} pendingLabel="Publicando…">Publicar evaluación</Button></div>
      <p className="text-sm text-[var(--color-on-surface-variant)]">Estado actual: {props.initialStatus === 'published' ? 'publicada' : props.initialStatus === 'draft' ? 'borrador' : 'sin publicar'}.</p>
    </CardContent></Card>
    <ConfirmDialog open={confirmPublish} onOpenChange={setConfirmPublish} title="Publicar evaluación" description="El veredicto, la nota si existe y la devolución quedarán visibles para el estudiante." confirmLabel="Publicar ahora" isPending={saving === 'published'} onConfirm={() => save('published')} />
  </div>;
}
