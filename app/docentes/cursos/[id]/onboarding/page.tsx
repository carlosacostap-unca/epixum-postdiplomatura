import { notFound } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { OnboardingReport } from "@/components/onboarding/OnboardingReport";
import { getOnboardingReport } from "@/lib/course-onboarding-data";
export const dynamic = "force-dynamic";
export default async function OnboardingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOnboardingReport(id).catch(() => null);
  if (!data) notFound();
  return <div className="page-container space-y-8"><TeacherCourseContext course={data.course} current="onboarding" title="Onboarding de estudiantes" description="Confirmación de datos, experiencia inicial con IA y preparación para las clases." /><OnboardingReport data={data} /></div>;
}
