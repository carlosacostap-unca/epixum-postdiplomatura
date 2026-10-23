import { createServiceClient } from './pocketbase-service';
import { closeExpiredCourseExams } from './course-exam-service';

export function startExamScheduler() {
  const host = globalThis as typeof globalThis & { courseExamTimer?: ReturnType<typeof setInterval> };
  if (host.courseExamTimer || process.env.NEXT_PHASE === 'phase-production-build') return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await closeExpiredCourseExams(await createServiceClient()); }
    catch { console.error('Parciales: falló el cierre automático; se reintentará en 5 segundos.'); }
    finally { busy = false; }
  };
  host.courseExamTimer = setInterval(() => { void tick(); }, 5000);
  host.courseExamTimer.unref();
}
