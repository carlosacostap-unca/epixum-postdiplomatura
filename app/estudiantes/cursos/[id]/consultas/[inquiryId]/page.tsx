import { notFound, redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui";
import { getInquiry, getInquiryResponses } from "@/lib/actions-inquiries";
import { getCourse, isStudentEnrolled, studentCanAccessCourseContent } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import StudentInquiryActions from "./StudentInquiryActions";

export const dynamic = "force-dynamic";

export default async function EstudianteInquiryDetailPage({ params }: { params: Promise<{ id: string; inquiryId: string }> }) {
  const { id, inquiryId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") redirect("/");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");
  const result = await getInquiry(inquiryId);
  if (!result.success || !result.data || result.data.course !== course.id) notFound();
  const inquiry = result.data;
  if (!(await studentCanAccessCourseContent(course, inquiry.week))) notFound();
  const responses = await getInquiryResponses(inquiry.id);
  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12"><StudentCourseContext course={course} current="consultas" title={inquiry.title} description="Conversación del foro del curso." /><Card><CardContent className="space-y-6"><div className="flex flex-wrap gap-3"><Badge tone={inquiry.status === "Pendiente" ? "warning" : "success"}>{inquiry.status}</Badge>{inquiry.author === user.id && <Badge tone="info">Tu consulta</Badge>}{inquiry.expand?.class && <Badge>{inquiry.expand.class.title}</Badge>}</div><div><p className="font-bold">{inquiry.expand?.author?.name || "Usuario"}</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]"><FormattedDate date={inquiry.created} showTime /></p></div><p className="whitespace-pre-wrap text-lg leading-relaxed text-[var(--color-on-surface-variant)]">{inquiry.description}</p></CardContent></Card><section aria-labelledby="responses-title" className="space-y-5"><h2 id="responses-title" className="font-headline text-2xl font-bold">Respuestas ({responses.length})</h2>{responses.length === 0 ? <EmptyState icon="chat_bubble" title="Todavía no hay respuestas" description="Podés añadir más contexto mientras esperás una respuesta." /> : <div className="space-y-4">{responses.map((response) => { const teacher = response.expand?.author?.role === "docente" || response.expand?.author?.role === "admin"; const mine = response.expand?.author?.id === user.id; return <Card key={response.id} className={teacher ? "border border-[var(--color-primary)]/30" : undefined}><CardContent><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{response.expand?.author?.name || "Usuario"}</span>{teacher && <Badge tone="success">Docente</Badge>}{mine && <Badge tone="info">Vos</Badge>}<span className="text-sm text-[var(--color-on-surface-variant)]"><FormattedDate date={response.created} showTime /></span></div><p className="mt-4 whitespace-pre-wrap leading-relaxed">{response.content}</p></CardContent></Card>; })}</div>}</section><StudentInquiryActions inquiryId={inquiry.id} currentStatus={inquiry.status} isAuthor={inquiry.author === user.id} /></div>;
}
