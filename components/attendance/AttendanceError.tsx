'use client';
import { Button } from '@/components/ui';
export function AttendanceError({ reset }: { reset: () => void }) {
  return <div className="space-y-4 p-6"><h2 className="text-xl font-bold">No pudimos cargar la asistencia</h2><p role="alert">Intentá nuevamente para consultar los registros del curso.</p><Button onClick={reset}>Reintentar</Button></div>;
}
