import { Card, CardContent } from '@/components/ui';
import { examDateLabel, type ExamView } from '@/lib/course-exams';
import { ExamListRefresh } from './ExamListRefresh';
import { CourseExamFeedback } from './CourseExamFeedback';
import Link from 'next/link';
import { CourseExamPhoto } from './CourseExamPhoto';
export function CourseExamInspection({ attempt, backPath }: { attempt: ExamView; backPath?: string }) {
  return <div className="space-y-4">{backPath && <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={backPath}>Volver a alumnos y notas</Link>}<h2 className="text-2xl font-bold">{attempt.title}</h2><Card><CardContent className="space-y-2"><h3 className="text-xl font-bold">{attempt.student?.name || attempt.student?.email || 'Alumno'}</h3>{attempt.student?.email && <p className="break-all">{attempt.student.email}</p>}<p>{attempt.result ? `Entregado: ${examDateLabel(attempt.result.finishedAt)}` : 'En curso'} · Cierre: {examDateLabel(attempt.deadline)}</p></CardContent></Card><CourseExamPhoto src={attempt.initialPhotoUrl} /><ExamListRefresh />{attempt.result?.feedbackAvailable ? <CourseExamFeedback result={attempt.result} audience="teacher" /> : <><p>El alumno todavía no entregó. La nota y la devolución final se generarán al entregar o al llegar el cierre.</p>{attempt.questions.map((q, i) => <Card key={q.id}><CardContent><h3 className="font-bold">{i + 1}. {q.prompt}</h3><p>Respuesta guardada: {q.options.find(o => o.id === attempt.selected[q.id])?.label || 'Sin responder'}</p></CardContent></Card>)}</>}</div>;
}
