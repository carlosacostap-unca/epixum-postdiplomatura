'use client';
import { useState } from 'react';
import { updateAssignmentLateSubmissions } from '@/lib/actions';
import { Button } from '@/components/ui';
import AssignmentLateSubmissionField from './AssignmentLateSubmissionField';

export default function AssignmentLatePolicyForm({ assignmentId, enabled }: { assignmentId: string; enabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  return <form action={async form => {
    setPending(true); setMessage('');
    try {
      const result = await updateAssignmentLateSubmissions(assignmentId, form.get('allowLateSubmissions') === 'on');
      setMessage(result.success ? 'Política guardada.' : result.error || 'No se pudo guardar.');
    } catch { setMessage('No se pudo guardar. Intentá nuevamente.'); }
    finally { setPending(false); }
  }} className="space-y-3">
    <AssignmentLateSubmissionField defaultChecked={enabled === true} />
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" variant="secondary" isPending={pending} pendingLabel="Guardando…">Guardar política</Button><p role="status" className="text-sm">{message}</p></div>
  </form>;
}
