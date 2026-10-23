import { StatCard } from '@/components/ui';
import type { StudentProgressRow } from '@/lib/student-progress';

export function StudentProgressSummary({ rows, preparationEnabled, examsEnabled, compact = false }: { rows: StudentProgressRow[]; preparationEnabled: boolean; examsEnabled: boolean; compact?: boolean }) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${compact ? '' : 'xl:grid-cols-4'}`} aria-label="Resumen del seguimiento de estudiantes">
    <StatCard label="Estudiantes matriculados" value={rows.length} icon="group" />
    <StatCard label="Con actividad de preparación" value={preparationEnabled ? rows.filter(r => r.preparation.attempts > 0).length : '—'} description={preparationEnabled ? 'Al menos una práctica iniciada.' : 'Preparación no habilitada.'} icon="quiz" />
    <StatCard label="Con parciales entregados" value={examsEnabled ? rows.filter(r => r.submittedExams > 0).length : '—'} description={examsEnabled ? 'Al menos una entrega definitiva.' : 'Parciales no habilitados.'} icon="assignment_turned_in" />
    <StatCard label="Sin actividad registrada" value={preparationEnabled || examsEnabled ? rows.filter(r => !r.lastActivity).length : '—'} description="Sólo preparación y parciales habilitados." icon="pending_actions" />
  </div>;
}
