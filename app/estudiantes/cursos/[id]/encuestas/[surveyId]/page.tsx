import { SurveyDetailPage } from '@/components/surveys/SurveyPages';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string; surveyId: string; }> }) {
 const { id, surveyId } = await params;
 return <SurveyDetailPage courseId={id} surveyId={surveyId} workspace="student" />;
}
