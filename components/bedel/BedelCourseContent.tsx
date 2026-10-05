import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FormattedDate from '@/components/FormattedDate';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';
import type { getBedelCourse } from '@/lib/course-bedel-data';
import type { Link } from '@/types';
import { ResourceReader } from '@/components/course/ResourceReader';
import { getBedelResourceDownloadUrl } from '@/lib/actions-bedel-resources';

function Resources({ links, courseId }: { links: Link[]; courseId: string }) {
  const safe = links.filter(link => link.type === 'file' || /^https?:\/\//i.test(link.url));
  if (!safe.length) return null;
  return <div className="mt-5"><ResourceReader links={safe} showHeading={false} downloadResource={getBedelResourceDownloadUrl.bind(null, courseId)} /></div>;
}

export default function BedelCourseContent({ data }: { data: Awaited<ReturnType<typeof getBedelCourse>> }) {
  const { course, classes, assignments, contents, weeks, lessons, links } = data;
  const groups = [
    { title: 'Clases', kind: 'class' as const, items: classes.map(item => ({ ...item, date: item.date })) },
    { title: 'Trabajos prácticos', kind: 'assignment' as const, items: assignments.map(item => ({ ...item, date: item.dueDate })) },
    ...(course.contentsEnabled ? [{ title: 'Contenidos', kind: 'content' as const, items: contents.map(item => ({ ...item, date: undefined, week: undefined })) }] : []),
  ];
  return <div className="space-y-8">
    {course.description && <Card><CardContent><div className="reading-content prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: course.description }} /></CardContent></Card>}
    {groups.map(group => <section key={group.kind} className="space-y-4"><h2 className="font-headline text-2xl font-bold">{group.title}</h2>
      {!group.items.length ? <EmptyState icon="description" title="Sin contenido" description="Todavía no se cargaron elementos en esta sección." /> : group.items.map(item => {
        const week = weeks.find(week => week.id === item.week);
        return <Card key={item.id}><CardContent>
          {week && <Badge>Semana {week.number}: {week.title} · {week.status}</Badge>}
          <h3 className="mt-2 font-headline text-xl font-bold">{item.title}</h3>
          {item.date && <p className="mt-2 text-sm text-[var(--color-text-muted)]"><FormattedDate date={item.date} showTime /></p>}
          {item.description && <div className="reading-content prose prose-invert mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: item.description }} />}
          <Resources courseId={course.id} links={links.filter(link => link[group.kind] === item.id)} />
        </CardContent></Card>;
      })}
    </section>)}
    {course.interactiveClassesEnabled && <section className="space-y-4"><h2 className="font-headline text-2xl font-bold">Clases interactivas</h2>
      {!lessons.length && <EmptyState icon="description" title="Sin clases interactivas" description="Todavía no se cargaron materiales." />}
      {lessons.map(lesson => <Card key={lesson.id}><CardContent><h3 className="font-headline text-xl font-bold">{lesson.title}</h3><p className="mt-2">{lesson.description}</p>
        {lesson.material?.screens.map(screen => <details key={screen.id} className="mt-4 rounded-xl border border-[var(--color-outline-variant)] p-4"><summary className="cursor-pointer font-semibold">{screen.title}</summary>
          <div className="prose prose-invert mt-4 max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{screen.body}</ReactMarkdown></div>
          {'options' in screen && <ul className="mt-4 list-inside list-disc">{screen.options.map(option => <li key={option.id}>{option.label}</li>)}</ul>}
        </details>)}
      </CardContent></Card>)}
    </section>}
  </div>;
}
