import { Card, CardContent } from '@/components/ui';
import { examDateLabel, type ExamVisibleResult } from '@/lib/course-exams';
import { COURSE_EXAM_APPROVAL_RULES } from '@/lib/course-exam-grading';
import { CourseExamStanding } from './CourseExamStanding';

export function CourseExamFeedback({ result, audience = 'student' }: { result: Extract<ExamVisibleResult, { feedbackAvailable: true }>; audience?: 'student' | 'teacher' }) {
  const omitted = result.review.filter(r => r.selectedOptionId === null).length;
  const incorrect = result.total - result.correct - omitted;
  return <section aria-label="Resultado y devolución completa" className="min-w-0 space-y-5">
    <Card><CardContent className="space-y-3">
      <h2 className="text-2xl font-bold">Resultado y devolución completa</h2>
      <p className="text-2xl font-bold">Nota: {(result.total ? result.correct / result.total * 10 : 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} / 10</p>
      <CourseExamStanding correct={result.correct} total={result.total} />
      <p className="text-sm text-[var(--color-text-muted)]">{COURSE_EXAM_APPROVAL_RULES}</p>
      <p>{result.correct} correctas · {incorrect} incorrectas · {omitted} sin responder</p>
      <p>{result.percentage}% de aciertos. Todas las preguntas valen lo mismo; las incorrectas y omitidas suman cero.</p>
      <p>Entrega: {examDateLabel(result.finishedAt)} (Argentina)</p>
    </CardContent></Card>
    {result.review.map(({ question, selectedOptionId, correct }, i) => <Card key={question.id}><CardContent className="min-w-0 space-y-4 break-words">
      <h3 className="text-lg font-bold">Pregunta {i + 1} · {selectedOptionId === null ? 'Sin responder' : correct ? 'Correcta' : 'Incorrecta'}</h3>
      <p className="whitespace-pre-wrap">{question.prompt}</p>
      <ul className="space-y-2">{question.options.map(option => <li key={option.id} className="rounded-xl border border-[var(--color-outline-variant)] p-3">
        <p className="whitespace-pre-wrap">{option.label}</p>
        {selectedOptionId === option.id && <p className="text-sm font-bold">{audience === 'teacher' ? 'Respuesta del alumno' : 'Tu respuesta'}</p>}
        {question.correctOptionId === option.id && <p className="text-sm font-bold text-[var(--color-primary)]">Respuesta correcta</p>}
      </li>)}</ul>
      {selectedOptionId === null && <p>{audience === 'teacher' ? 'El alumno no seleccionó una opción.' : 'No seleccionaste una opción.'} Esta pregunta suma cero puntos.</p>}
      <div className="space-y-2"><h4 className="font-bold">Explicación</h4><p className="whitespace-pre-wrap">{question.explanation || 'La opción indicada como correcta es la respuesta esperada para este enunciado.'}</p></div>
    </CardContent></Card>)}
  </section>;
}
