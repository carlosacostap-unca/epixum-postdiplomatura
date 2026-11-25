import { CourseExamRequirements } from '@/components/exams/CourseExamRequirements';
import { ExamListRefresh } from '@/components/exams/ExamListRefresh';
import { examAvailability, examDateLabel, examLocalDate, examSchedule } from '@/lib/course-exams';
import { getCourseExamStart } from '@/lib/course-exam-data';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { CourseExamStart } from '@/components/exams/CourseExamRunner';
import { redirect } from 'next/navigation';
import { isFiaMakeup } from '@/lib/fia-makeup';
export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params; const { course, exam, requirements, existingAttemptId } = await getCourseExamStart(id, examId);
  if (existingAttemptId) redirect(`/estudiantes/cursos/${id}/parciales/intentos/${existingAttemptId}`);
  const availability = examAvailability(exam);
  const ready = requirements.every(item => item.completed);
  const makeup = isFiaMakeup(id, examId);
  return <div className="page-container space-y-6">
    <StudentCourseContext course={course} current="parciales" title={exam.title} />
    <p>{availability}</p>
    {makeup && <section className="space-y-2">
      <h2 className="text-xl font-bold">{availability === 'Cerrado' ? 'Los turnos de este recuperatorio finalizaron' : ready ? 'Estás habilitado para rendir este recuperatorio' : 'Tenés este recuperatorio asignado'}</h2>
      <p>Horarios de Argentina. Tenés un solo intento.</p>
      <ul className="list-disc pl-5">{examSchedule(exam).map(turn => <li key={turn.id}>{examDateLabel(turn.opensAt)} a {examLocalDate(turn.closesAt).slice(11, 16)}</li>)}</ul>
      <p>Para empezar, encendé la cámara y aceptá la foto inicial. Mantené la cámara encendida mientras rendís.</p>
    </section>}
    <ExamListRefresh label={requirements.length ? 'Actualizar requisitos' : 'Actualizar estado'} />
    <CourseExamRequirements courseId={id} requirements={requirements} />
    {ready && availability === 'Activo' && <CourseExamStart courseId={id} exam={exam} />}
    {!makeup && availability === 'Programado' && <p>Podrás comenzar dentro del horario de un turno.</p>}
  </div>;
}
