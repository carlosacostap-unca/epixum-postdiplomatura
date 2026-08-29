'use client';

import { useState } from 'react';
import { saveAssignmentAIConfig } from '@/lib/actions-ai-config';
import type { AssignmentAIConfigDTO } from '@/lib/assignment-ai-config';
import type { AIVerdict } from '@/types';
import { Badge, Button, Card, CardContent, useToast } from '@/components/ui';

const VERDICTS: AIVerdict[] = ['Aprobado', 'Desaprobado', 'Corregir y reenviar'];

function criteriaText(config: AssignmentAIConfigDTO) {
  return config.criteria.map((criterion) => [criterion.title, criterion.description, criterion.weight ?? ''].join(' | ')).join('\n');
}

function parseCriteria(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [title = '', description = '', rawWeight = ''] = line.split('|').map((part) => part.trim());
    const slug = title.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const numericWeight = rawWeight === '' ? null : Number(rawWeight);
    return { id: `${slug || 'criterio'}-${index + 1}`.slice(0, 80), title, description, weight: Number.isFinite(numericWeight) ? numericWeight : null };
  });
}

export default function AssignmentAIConfigPanel({ assignmentId, courseEnabled, initialConfig }: { assignmentId: string; courseEnabled: boolean; initialConfig: AssignmentAIConfigDTO }) {
  const [config, setConfig] = useState(initialConfig);
  const [criteria, setCriteria] = useState(criteriaText(initialConfig));
  const [checks, setChecks] = useState(initialConfig.requiredChecks.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useToast();

  async function save() {
    setSaving(true);
    setError('');
    const payload = {
      active: courseEnabled && config.active,
      criteria: parseCriteria(criteria),
      requiredChecks: checks.split('\n').map((line) => line.trim()).filter(Boolean),
      allowedVerdicts: config.allowedVerdicts,
      gradeEnabled: config.gradeEnabled,
      gradeMin: config.gradeEnabled ? config.gradeMin : null,
      gradeMax: config.gradeEnabled ? config.gradeMax : null,
      messageGuidance: config.messageGuidance,
      additionalInstructions: config.additionalInstructions,
    };
    const result = await saveAssignmentAIConfig(assignmentId, payload);
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setConfig(result.config);
    notify({ title: 'Configuración de IA guardada', description: `Versión ${result.config.version}`, tone: 'success' });
  }

  function toggleVerdict(verdict: AIVerdict) {
    setConfig((current) => ({ ...current, allowedVerdicts: current.allowedVerdicts.includes(verdict) ? current.allowedVerdicts.filter((item) => item !== verdict) : [...current.allowedVerdicts, verdict] }));
  }

  return <Card>
    <CardContent className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><h2 className="font-headline text-2xl font-bold">Preevaluación asistida por IA</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Configuración privada del docente para repositorios públicos de GitHub.</p></div>
        <Badge tone={courseEnabled && config.active ? 'success' : 'neutral'}>{courseEnabled && config.active ? 'Activa' : 'Inactiva'}</Badge>
      </div>

      {!courseEnabled && <p role="status" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-on-surface-variant)]">El administrador deshabilitó la IA para este curso. La configuración versión {config.version} se conserva, pero no puede activarse ni ejecutarse.</p>}
      {error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{error}</p>}

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={courseEnabled && config.active} disabled={!courseEnabled} onChange={(event) => setConfig((current) => ({ ...current, active: event.target.checked }))} className="mt-1 size-5" />
        <span><span className="block font-bold">Activar para este trabajo práctico</span><span className="text-sm text-[var(--color-on-surface-variant)]">La acción aparecerá únicamente en entregas GitHub elegibles.</span></span>
      </label>

      <div className="space-y-2"><label htmlFor="ai-criteria" className="text-sm font-bold">Rúbrica</label><textarea id="ai-criteria" rows={6} value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder={'Calidad del código | Evalúa legibilidad y diseño | 40\nCumplimiento | Resuelve todos los requisitos | 60'} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /><p className="text-xs text-[var(--color-on-surface-variant)]">Un criterio por línea: título | descripción | peso opcional.</p></div>
      <div className="space-y-2"><label htmlFor="ai-checks" className="text-sm font-bold">Requisitos obligatorios</label><textarea id="ai-checks" rows={4} value={checks} onChange={(event) => setChecks(event.target.value)} placeholder="Un requisito por línea" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /></div>

      <fieldset className="space-y-3"><legend className="text-sm font-bold">Veredictos permitidos</legend><div className="flex flex-wrap gap-4">{VERDICTS.map((verdict) => <label key={verdict} className="flex items-center gap-2"><input type="checkbox" checked={config.allowedVerdicts.includes(verdict)} onChange={() => toggleVerdict(verdict)} />{verdict}</label>)}</div></fieldset>

      <div className="space-y-4 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-high)] p-4"><label className="flex items-center gap-3"><input type="checkbox" checked={config.gradeEnabled} onChange={(event) => setConfig((current) => ({ ...current, gradeEnabled: event.target.checked, gradeMin: event.target.checked ? (current.gradeMin ?? 0) : null, gradeMax: event.target.checked ? (current.gradeMax ?? 10) : null }))} /><span className="font-bold">Sugerir nota numérica</span></label>{config.gradeEnabled && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Mínimo<input type="number" value={config.gradeMin ?? 0} onChange={(event) => setConfig((current) => ({ ...current, gradeMin: Number(event.target.value) }))} className="mt-1 w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3" /></label><label className="text-sm font-bold">Máximo<input type="number" value={config.gradeMax ?? 10} onChange={(event) => setConfig((current) => ({ ...current, gradeMax: Number(event.target.value) }))} className="mt-1 w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3" /></label></div>}</div>

      <div className="space-y-2"><label htmlFor="ai-message" className="text-sm font-bold">Orientación del mensaje al alumno</label><textarea id="ai-message" rows={3} value={config.messageGuidance} onChange={(event) => setConfig((current) => ({ ...current, messageGuidance: event.target.value }))} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /></div>
      <div className="space-y-2"><label htmlFor="ai-instructions" className="text-sm font-bold">Instrucciones adicionales</label><textarea id="ai-instructions" rows={5} value={config.additionalInstructions} onChange={(event) => setConfig((current) => ({ ...current, additionalInstructions: event.target.value }))} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /><p className="text-xs text-[var(--color-on-surface-variant)]">El enunciado del TP se incorpora automáticamente.</p></div>
      <div className="flex justify-end"><Button onClick={save} isPending={saving} pendingLabel="Guardando…" disabled={!courseEnabled}>Guardar configuración</Button></div>
    </CardContent>
  </Card>;
}
