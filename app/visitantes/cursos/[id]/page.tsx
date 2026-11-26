import { notFound } from 'next/navigation';
import Link from 'next/link';
import BedelCourseContent from '@/components/bedel/BedelCourseContent';
import { Badge, Breadcrumbs, Card, CardContent, PageHeader } from '@/components/ui';
import { getVisitingTeacherResourceDownloadUrl } from '@/lib/actions-bedel-resources';
import { getVisitingTeacherCourse } from '@/lib/course-visiting-teacher-data';
import { getErrorStatus } from '@/lib/errors';

type Question = { id: string; prompt: string; kind?: string; options: { id: string; label: string }[] };
type Activity = {
  id: string;
  title: string;
  description: string;
  resultsHref?: string;
  questions?: Question[];
  sessions?: { id: string; label: string; questions: Question[] }[];
};

function Questions({ questions }: { questions: Question[] }) {
  return <ol className="mt-4 list-decimal space-y-4 pl-6">
    {questions.map(question => <li key={question.id}>
      <p className="whitespace-pre-wrap">{question.prompt}</p>
      {question.kind && <p className="text-sm text-[var(--color-text-muted)]">{question.kind}</p>}
      {question.options.length > 0 && <ul className="mt-1 list-disc pl-5">
        {question.options.map(option => <li key={option.id}>{option.label}</li>)}
      </ul>}
    </li>)}
  </ol>;
}

export default async function VisitingTeacherCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, modules, quizzes, exams, surveys, reviews } = await getVisitingTeacherCourse(id).catch(error => {
    if (getErrorStatus(error) === 404) notFound();
    throw error;
  });
  const sections: { title: string; items: Activity[] }[] = [
    { title: 'Preparación', items: quizzes.map(item => ({ ...item, resultsHref: `/visitantes/cursos/${id}/preparacion/${item.id}` })) },
    { title: 'Parciales y exámenes', items: exams.map(item => ({ ...item, resultsHref: `/visitantes/cursos/${id}/parciales/${item.id}` })) },
    { title: 'Encuestas', items: surveys },
    { title: 'Instancias de revisión', items: reviews },
  ];
  return <div className="page-container space-y-8">
    <Breadcrumbs items={[{ href: '/visitantes', label: 'Mis cursos' }, { label: content.course.title }]} />
    <PageHeader eyebrow="Docencia visitante" title={content.course.title} actions={<Badge>Solo lectura</Badge>} />
    {modules.length > 0 && <section className="space-y-3">
      <h2 className="font-headline text-2xl font-bold">Módulos</h2>
      <ul>{modules.map(module => <li key={module.id}>Módulo {module.number} · {module.title}</li>)}</ul>
    </section>}
    <BedelCourseContent data={content} downloadResource={getVisitingTeacherResourceDownloadUrl} />
    {sections.filter(section => section.items.length > 0).map(section => <section key={section.title} className="space-y-4">
      <h2 className="font-headline text-2xl font-bold">{section.title}</h2>
      {section.items.map(item => <Card key={item.id}><CardContent>
        <details>
          <summary className="cursor-pointer font-headline text-xl font-bold">{item.title}</summary>
          {item.description && <p className="mt-3 whitespace-pre-wrap">{item.description}</p>}
          {item.questions && <Questions questions={item.questions} />}
          {item.sessions?.map(session => <div key={session.id} className="mt-4">
            <h3 className="font-semibold">{session.label}</h3>
            <Questions questions={session.questions} />
          </div>)}
        </details>
        {item.resultsHref && <Link href={item.resultsHref} prefetch={false} className="mt-2 inline-flex min-h-11 items-center font-semibold text-[var(--color-primary)]" aria-label={`Ver intentos y notas de ${item.title}`}>
          Ver intentos y notas
        </Link>}
      </CardContent></Card>)}
    </section>)}
  </div>;
}
