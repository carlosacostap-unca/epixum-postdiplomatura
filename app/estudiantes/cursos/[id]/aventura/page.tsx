import { readSofiaProgress } from '@/lib/course-game/sofia-service';
import { saveSofiaAction } from '@/lib/course-game/sofia-actions';
import { loadBoardAction } from '@/lib/course-game/board-actions';
import { syncGameScheduleAction } from '@/lib/course-game/schedule-actions';
import { notFound, redirect } from 'next/navigation';
import CourseGameExperience from '@/components/course-game/CourseGameExperience';
import { readGameWelcome } from '@/lib/course-game/onboarding-service';
import { saveGameIdentityAction, updateGameIdentityAction, advanceGameTourAction } from '@/lib/course-game/onboarding-actions';
import { createServiceClient } from '@/lib/pocketbase-service';
import { readCourseGame } from '@/lib/course-game/service';
import { createServerClient } from '@/lib/pocketbase-server';

export const dynamic = 'force-dynamic';

export default async function CourseAdventurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pb = await createServerClient();
  if (!pb.authStore.isValid || !pb.authStore.record?.id) redirect('/login');
  const game = await readCourseGame(pb, id);
  if (!game) notFound();
  const welcome = await readGameWelcome(pb, await createServiceClient(), id);
  const sofia=await readSofiaProgress(pb,await createServiceClient(),id);
  return <CourseGameExperience initialSofia={sofia} saveSofia={saveSofiaAction.bind(null,id)} syncSchedule={syncGameScheduleAction.bind(null,id)} loadBoard={loadBoardAction.bind(null, id)} game={game} welcome={welcome} actions={{ update: updateGameIdentityAction.bind(null, id), save: saveGameIdentityAction.bind(null, id), advance: advanceGameTourAction.bind(null, id) }} />;
}
