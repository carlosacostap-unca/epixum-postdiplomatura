import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { PreparationOverview } from '@/components/preparation/PreparationOverview';
import { getPreparation } from '@/lib/preparation-data';
export default async function PreparationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; h?: string }> }) {
  const { id } = await params; const { p, h } = await searchParams; const data = await getPreparation(id, 'student', Number(p), Number(h));
  return <div className="page-container space-y-8"><StudentCourseContext course={data.course} current="preparacion" title="Preparación" description="Practicá a tu ritmo, revisá las explicaciones y volvé a intentarlo. No afecta tus notas oficiales." /><PreparationOverview data={data} mode="student" /></div>;
}
