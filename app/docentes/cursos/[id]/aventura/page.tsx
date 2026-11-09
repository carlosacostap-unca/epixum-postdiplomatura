import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/pocketbase-server';
import { authorizeCourseGame } from '@/lib/course-game/service';
import CourseAdventurePage from '@/app/estudiantes/cursos/[id]/aventura/page';
export const dynamic='force-dynamic';
export default async function TeacherAdventurePage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!(await authorizeCourseGame(await createServerClient(),id))?.canPresent)notFound();
 return CourseAdventurePage({params:Promise.resolve({id})});
}
