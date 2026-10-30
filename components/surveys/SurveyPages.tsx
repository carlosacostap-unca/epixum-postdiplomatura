import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Course } from '@/types';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import FormattedDate from '@/components/FormattedDate';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { listCourseSurveys, readCourseSurvey, readSurveyResults, requireSurveyAccess, type SurveyMode } from '@/lib/course-survey-service';
import { SurveyError, surveyIsOpen, type CourseSurvey } from '@/lib/course-surveys';
import { SurveyEditor } from './SurveyEditor';
import { SurveyDraft } from './SurveyDraft';
import { SurveyActions } from './SurveyActions';
import { SurveyResponseForm } from './SurveyResponseForm';
import { SurveyResults } from './SurveyResults';

export type SurveyWorkspace = 'admin' | 'teacher' | 'student';
type Props = { courseId: string; workspace: SurveyWorkspace };
const modeFor = (workspace: SurveyWorkspace): SurveyMode => workspace === 'student' ? 'student' : 'manager';
function baseFor(course: string, workspace: SurveyWorkspace) {
  return workspace === 'admin' ? `/admin/courses/${course}/encuestas` : `/${workspace === 'teacher' ? 'docentes' : 'estudiantes'}/cursos/${course}/encuestas`;
}
async function context(courseId: string, workspace: SurveyWorkspace) {
  const pb = await createServerClient();
  await requireSurveyAccess(pb, courseId, modeFor(workspace));
  if (workspace === 'admin' && pb.authStore.record?.role !== 'admin') throw new SurveyError('No tenés acceso administrativo.');
  const service = await createServiceClient();
  return { pb, service };
}
function unavailable(error: unknown): never {
  if (error instanceof SurveyError || (error && typeof error === 'object' && 'status' in error && error.status === 404)) notFound();
  throw error;
}
function Frame({ workspace, course, children }: { workspace: SurveyWorkspace; course: Course; children: ReactNode }) {
  return <div className={workspace === 'admin' ? 'space-y-8' : 'page-container space-y-8'}>
    {workspace === 'teacher' ? <TeacherCourseContext course={course} current="encuestas" title="Encuestas" description="Consultá a tus alumnos y conocé sus experiencias, necesidades y opiniones." />
      : workspace === 'student' ? <StudentCourseContext course={course} current="encuestas" title="Encuestas" description="Tu experiencia ayuda a mejorar el curso. Encontrá acá las encuestas del equipo docente." />
      : <h2 className="text-2xl font-bold">Encuestas</h2>}
    {children}
  </div>;
}
function Status({ survey }: { survey: CourseSurvey }) {
  const open = surveyIsOpen(survey);
  return <Badge tone={survey.status === 'draft' ? 'warning' : open ? 'success' : 'neutral'}>{survey.status === 'draft' ? 'Borrador' : open ? 'Abierta' : 'Cerrada'}</Badge>;
}

export async function SurveyListPage({ courseId, workspace }: Props) {
  const { pb, service } = await context(courseId, workspace).catch(unavailable);
  const { course, surveys } = await listCourseSurveys(pb, service, courseId, modeFor(workspace)).catch(unavailable);
  const base = baseFor(courseId, workspace);
  const manager = workspace !== 'student';
  return <Frame workspace={workspace} course={course}>
    {manager && <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-[var(--color-on-surface-variant)]">{surveys.length} encuestas en este curso</p><Link className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-on-primary)]" href={`${base}/nueva`}>Crear encuesta</Link></div>}
    {!surveys.length ? <EmptyState icon="poll" title={manager ? 'Creá la primera encuesta' : 'Todavía no hay encuestas publicadas'} description={manager ? 'Empezá con un diagnóstico inicial, una consulta sobre dificultades o una evaluación del curso.' : 'Las encuestas aparecerán acá cuando el equipo docente las publique.'} />
      : <div className="grid gap-5 md:grid-cols-2">{surveys.map(survey => <Card key={survey.id}><CardContent className="flex h-full flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2"><Status survey={survey} /><Badge>{survey.anonymous ? 'Anónima' : 'Identificada'}</Badge>{survey.submitted && <Badge tone="success">Respondida</Badge>}</div>
        <h2 className="break-words text-xl font-bold"><Link href={`${base}/${survey.id}`} className="hover:underline">{survey.title}</Link></h2>
        {survey.description && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-[var(--color-on-surface-variant)]">{survey.description}</p>}
        <p className="text-sm text-[var(--color-on-surface-variant)]">{survey.questions.length} preguntas{manager ? ` · ${survey.responseCount} respuestas` : ''}</p>
        {survey.closesAt && <p className="text-sm text-[var(--color-on-surface-variant)]">Cierre: <FormattedDate date={survey.closesAt} showTime /></p>}
        <Link href={`${base}/${survey.id}`} className="mt-auto inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">{manager ? survey.status === 'draft' ? 'Editar borrador' : 'Ver resultados' : survey.submitted ? 'Ver confirmación' : surveyIsOpen(survey) ? 'Responder encuesta' : 'Ver encuesta'} →</Link>
      </CardContent></Card>)}</div>}
  </Frame>;
}

export async function SurveyNewPage({ courseId, workspace }: Props) {
  if (workspace === 'student') notFound();
  const { pb } = await context(courseId, workspace).catch(unavailable);
  const { course } = await requireSurveyAccess(pb, courseId, 'manager').catch(unavailable);
  return <Frame workspace={workspace} course={course}><h2 className="text-2xl font-bold">Nueva encuesta</h2><SurveyEditor courseId={courseId} base={baseFor(courseId, workspace)} /></Frame>;
}

export async function SurveyDetailPage({ courseId, surveyId, workspace }: Props & { surveyId: string }) {
  const { pb, service } = await context(courseId, workspace).catch(unavailable);
  const { course, survey, submitted } = await readCourseSurvey(pb, service, courseId, surveyId, modeFor(workspace)).catch(unavailable);
  const manager = workspace !== 'student';
  const base = baseFor(courseId, workspace);
  const results = manager && survey.status !== 'draft' ? await readSurveyResults(pb, service, courseId, surveyId).catch(unavailable) : null;
  return <Frame workspace={workspace} course={course}>
    <Link href={base} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">← Todas las encuestas</Link>
    <div className="space-y-3"><div className="flex flex-wrap gap-2"><Status survey={survey} /><Badge>{survey.anonymous ? 'Anónima' : 'Identificada'}</Badge></div><h2 className="break-words text-2xl font-bold">{survey.title}</h2>{survey.description && <p className="whitespace-pre-wrap break-words text-[var(--color-on-surface-variant)]">{survey.description}</p>}{survey.closesAt && <p className="text-sm">Cierre: <FormattedDate date={survey.closesAt} showTime /></p>}</div>
    {manager ? <>
      {survey.status === 'draft' ? <SurveyDraft key={survey.revision} survey={survey} base={base} /> : <>
        <SurveyActions survey={survey} base={base} />
        <details className="rounded-xl border border-[var(--color-outline-variant)] p-5"><summary className="cursor-pointer font-bold">Ver preguntas publicadas</summary><ol className="mt-4 list-inside list-decimal space-y-4">{survey.questions.map(q => <li key={q.id} className="break-words">{q.title} <span className="text-sm text-[var(--color-on-surface-variant)]">({q.required ? 'obligatoria' : 'opcional'})</span>{q.options.length > 0 && <ul className="mt-2 list-inside list-disc pl-4 text-sm">{q.options.map(o => <li key={o.id}>{o.label}</li>)}</ul>}{q.type === 'scale' && <p className="mt-2 text-sm">Escala de 1 a 5</p>}</li>)}</ol></details>
        {results && <SurveyResults survey={survey} results={results} />}
      </>}
    </> : <SurveyResponseForm survey={survey} submitted={submitted} />}
  </Frame>;
}
