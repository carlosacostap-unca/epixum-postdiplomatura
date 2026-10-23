import { Card, CardContent } from '@/components/ui';
import { examDateLabel, type ExamView } from '@/lib/course-exams';
import { ExamListRefresh } from './ExamListRefresh';
export function CourseExamInspection({ attempt }: { attempt: ExamView }) {
  return <div className="space-y-4"><h2 className="text-2xl font-bold">{attempt.title}</h2><ExamListRefresh /><p>{attempt.result ? `Entregado: ${examDateLabel(attempt.result.finishedAt)}` : 'En curso'} · Cierre: {examDateLabel(attempt.deadline)}</p>{attempt.questions.map((q, i) => <Card key={q.id}><CardContent><h3 className="font-bold">{i + 1}. {q.prompt}</h3><p>Respuesta guardada: {q.options.find(o => o.id === attempt.selected[q.id])?.label || 'Sin responder'}</p></CardContent></Card>)}</div>;
}
