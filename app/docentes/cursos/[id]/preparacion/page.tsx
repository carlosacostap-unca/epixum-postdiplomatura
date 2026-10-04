import Link from 'next/link';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { PreparationOverview, preparationLink } from '@/components/preparation/PreparationOverview';
import { getPreparation } from '@/lib/preparation-data';

export default async function PreparationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; h?: string }> }) {
  const { id } = await params; const { p, h } = await searchParams;
  const data = await getPreparation(id, 'teacher', Number(p), Number(h));
  return <div className="page-container space-y-8"><TeacherCourseContext course={data.course} current="preparacion" title="Preparación" description="Creá evaluaciones simuladas y acompañá la práctica de tus alumnos. Sus resultados no modifican notas oficiales." actions={<Link className={preparationLink} href={`/docentes/cursos/${id}/preparacion/nueva`}>Nueva práctica</Link>} /><PreparationOverview data={data} mode="teacher" /></div>;
}
