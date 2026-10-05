import { notFound } from "next/navigation";
import { OnboardingReport } from "@/components/onboarding/OnboardingReport";
import { getOnboardingReport } from "@/lib/course-onboarding-data";
export const dynamic = "force-dynamic";
export default async function AdminOnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOnboardingReport(id).catch(() => null);
  if (!data) notFound();
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Onboarding de estudiantes</h2><OnboardingReport data={data} /></div>;
}
