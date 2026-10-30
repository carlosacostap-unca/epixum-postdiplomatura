import { SurveyNewPage } from '@/components/surveys/SurveyPages';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string;  }> }) {
 const { id } = await params;
 return <SurveyNewPage courseId={id} workspace="admin" />;
}
