import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import {
  Badge,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getTeacherDashboardData } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

function studentName(delivery: Awaited<ReturnType<typeof getTeacherDashboardData>>["pendingDeliveries"][number]) {
  const student = delivery.expand?.student;
  return [student?.firstName ?? student?.name, student?.lastName].filter(Boolean).join(" ") || "Estudiante";
}

export default async function DocentesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dashboard = await getTeacherDashboardData(user.id);
  const firstName = user.firstName || user.name?.split(" ")[0] || "Docente";
  const hasPending = dashboard.pendingDeliveryCount + dashboard.pendingInquiryCount > 0;

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <PageHeader
        eyebrow="Panel docente"
        title={<>Hola, <span className="text-[var(--color-primary)]">{firstName}</span></>}
        description={hasPending
          ? "Estos son los elementos que requieren tu atención."
          : "Todo está al día. Podés continuar preparando el contenido de tus cursos."}
      />

      <section aria-label="Resumen docente" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Cursos asignados"
          value={dashboard.courses.length}
          icon="school"
          href="/docentes/clases"
          tone="primary"
          description="Abrir clases por curso"
        />
        <StatCard
          label="Entregas por revisar"
          value={dashboard.pendingDeliveryCount}
          icon="rate_review"
          tone={dashboard.pendingDeliveryCount ? "warning" : "neutral"}
          description="Sin evaluación publicada"
        />
        <StatCard
          label="Consultas pendientes"
          value={dashboard.pendingInquiryCount}
          icon="forum"
          tone={dashboard.pendingInquiryCount ? "warning" : "neutral"}
          description="Ordenadas por antigüedad"
        />
      </section>

      {!hasPending ? (
        <EmptyState
          icon="task_alt"
          title="Estás al día"
          description="No hay entregas sin evaluación publicada ni consultas pendientes en tus cursos."
          action={dashboard.courses[0] ? (
            <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-bold text-[var(--color-on-primary)]" href={`/docentes/cursos/${dashboard.courses[0].id}`}>
              Gestionar contenido
            </Link>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-2">
          <section aria-labelledby="pending-deliveries-title" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 id="pending-deliveries-title" className="font-headline text-2xl font-bold">Entregas por revisar</h2>
              <Badge tone="warning">{dashboard.pendingDeliveryCount} pendientes</Badge>
            </div>
            {dashboard.pendingDeliveries.length === 0 ? (
              <EmptyState icon="assignment_turned_in" title="Sin entregas pendientes" description="Las evaluaciones publicadas ya no aparecen en esta lista." />
            ) : (
              <div className="space-y-3">
                {dashboard.pendingDeliveries.map((delivery) => {
                  const assignment = delivery.expand?.assignment;
                  return (
                    <Link key={delivery.id} href={`/docentes/cursos/${assignment?.course}/tps/${delivery.assignment}#entregas`} className="block rounded-[var(--epixum-radius-lg)] focus-visible:outline-offset-4">
                      <Card className="transition-colors hover:bg-[var(--color-surface-container)]">
                        <CardContent className="flex items-center justify-between gap-4 py-5">
                          <div className="min-w-0">
                            <p className="truncate font-bold">{assignment?.title || "Trabajo práctico"}</p>
                            <p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">{studentName(delivery)} · Entregada <FormattedDate date={delivery.created} /></p>
                          </div>
                          <Badge tone={delivery.status === "draft" ? "info" : "warning"}>{delivery.status === "draft" ? "Borrador" : "Sin evaluar"}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="pending-inquiries-title" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 id="pending-inquiries-title" className="font-headline text-2xl font-bold">Consultas pendientes</h2>
              <Badge tone="warning">{dashboard.pendingInquiryCount} pendientes</Badge>
            </div>
            {dashboard.pendingInquiries.length === 0 ? (
              <EmptyState icon="forum" title="Sin consultas pendientes" description="Las consultas resueltas siguen disponibles dentro de cada curso." />
            ) : (
              <div className="space-y-3">
                {dashboard.pendingInquiries.map((inquiry) => (
                  <Link key={inquiry.id} href={`/docentes/cursos/${inquiry.course}/consultas/${inquiry.id}`} className="block rounded-[var(--epixum-radius-lg)] focus-visible:outline-offset-4">
                    <Card className="transition-colors hover:bg-[var(--color-surface-container)]">
                      <CardContent className="flex items-center justify-between gap-4 py-5">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{inquiry.title}</p>
                          <p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">{inquiry.expand?.course?.title || "Curso"} · <FormattedDate date={inquiry.created} showTime /></p>
                        </div>
                        <span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">arrow_forward</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <section aria-labelledby="teacher-courses-title" className="space-y-5">
        <div>
          <h2 id="teacher-courses-title" className="font-headline text-2xl font-bold md:text-3xl">Tus cursos</h2>
          <p className="mt-1 text-[var(--color-on-surface-variant)]">Contenido, participantes, consultas y acceso en un mismo contexto.</p>
        </div>
        {dashboard.courses.length === 0 ? (
          <EmptyState icon="school" title="No tenés cursos asignados" description="Cuando un administrador te asigne un curso, aparecerá aquí." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.courses.map((course) => (
              <Link key={course.id} href={`/docentes/cursos/${course.id}`} className="group rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                <Card className="flex h-full flex-col transition-colors group-hover:bg-[var(--color-surface-container)]">
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]" aria-hidden="true">deployed_code</span>
                      <Badge tone={course.status === "en curso" ? "success" : course.status === "borrador" ? "warning" : "neutral"}>{course.status}</Badge>
                    </div>
                    <h3 className="font-headline text-xl font-bold group-hover:text-[var(--color-primary)]">{course.title}</h3>
                    <div className="line-clamp-3 text-sm leading-relaxed text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: course.description || "Sin descripción." }} />
                    <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-bold">Gestionar curso <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
