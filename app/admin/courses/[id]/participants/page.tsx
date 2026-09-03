import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, EmptyState, Tabs } from "@/components/ui";
import CourseParticipantManager from "@/components/CourseParticipantManager";
import { getCourse } from "@/lib/data";
import { getCourseParticipantCounts, getCourseParticipants } from "@/lib/course-participant-data";
import { normalizeParticipantPage, normalizeParticipantSearch } from "@/lib/course-participants";

type ParticipantTab = "alumnos" | "docentes" | "invitaciones";

export default async function CourseParticipantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const { id } = await params;
  const input = await searchParams;
  const tab: ParticipantTab = input.tab === "docentes" || input.tab === "invitaciones" ? input.tab : "alumnos";
  const query = normalizeParticipantSearch(input.q);
  const pageNumber = normalizeParticipantPage(input.page);
  const [course, counts] = await Promise.all([getCourse(id).catch(() => null), getCourseParticipantCounts(id)]);
  if (!course) notFound();
  const base = `/admin/courses/${id}/participants`;
  const participantPage = tab === "invitaciones" ? null : await getCourseParticipants(id, tab === "alumnos" ? "students" : "teachers", { page: pageNumber, query });

  return (
    <Card>
      <CardContent className="space-y-7">
        <Tabs label="Tipos de participantes" items={[
          { href: `${base}?tab=alumnos`, label: `Alumnos (${counts.students})`, icon: "school", isActive: tab === "alumnos" },
          { href: `${base}?tab=docentes`, label: `Docentes (${counts.teachers})`, icon: "co_present", isActive: tab === "docentes" },
          { href: `${base}?tab=invitaciones`, label: `Invitaciones (${counts.invitations})`, icon: "mark_email_unread", isActive: tab === "invitaciones" },
        ]} />
        {tab === "invitaciones" ? <EmptyState icon="forward_to_inbox" title="Invitaciones y acceso" description="Las invitaciones son para personas que todavía no tienen cuenta. Epixum no envía emails; la comunicación se realiza fuera de la plataforma." action={<Link href={`/admin/courses/${id}/access`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-on-primary)]">Administrar invitaciones</Link>} /> : participantPage ? <CourseParticipantManager courseId={id} courseTitle={course.title} page={participantPage} query={query} target={tab === "alumnos" ? "students" : "teachers"} /> : null}
      </CardContent>
    </Card>
  );
}
