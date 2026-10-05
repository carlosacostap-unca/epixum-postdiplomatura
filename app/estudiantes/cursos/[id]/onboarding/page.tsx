import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getStudentOnboarding } from "@/lib/course-onboarding-data";
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentOnboarding(id).catch(() => null);
  if (!data) notFound();
  return <div className="page-container max-w-4xl space-y-8">
    <Link href={data.enrolled ? `/estudiantes/cursos/${id}` : "/estudiantes"} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">← {data.enrolled ? "Resumen del curso" : "Mis invitaciones"}</Link>
    <PageHeader eyebrow="Bienvenida al curso" title={data.course.title} description="Confirmá tus datos, contanos tu experiencia y preparate para las clases en vivo. Guardaremos el avance al completar cada etapa." />
    <OnboardingWizard courseId={id} profile={data.profile} progress={data.progress} survey={data.survey} enrolled={data.enrolled} />
  </div>;
}
