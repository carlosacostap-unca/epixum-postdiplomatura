import 'server-only';
import type PocketBase from 'pocketbase';
import type { Class, Link } from '@/types';
import { authorizeCourseGame } from './service';
import { isPublicationVisible, isPublished } from '@/lib/publication';
import { isSharedResourceAudience } from '@/lib/resource-audience';
import type { BoardContent } from './board';
import { classHasStarted } from './schedule';
export async function readBoardContent(pb:PocketBase,courseId:string,classId:string):Promise<BoardContent> {
  const access=await authorizeCourseGame(pb,courseId);
  if(!access) throw new Error('Acceso no autorizado');
  const lesson=await pb.collection('classes').getOne<Class>(classId,{fields:'id,course,title,description,date,publicationStatus,publishAt'});
  if(lesson.course!==courseId || !isPublicationVisible(lesson) || !(access.config?.enabledClassIds ? access.config.enabledClassIds.includes(classId) : classHasStarted(lesson.date,Date.now()))) throw new Error('Clase no disponible');
  const links=await pb.collection('links').getFullList<Link>({filter:pb.filter('class = {:id}',{id:classId}),sort:'created',fields:'id,class,assignment,content,title,url,type,audience,publicationStatus'});
  return {title:lesson.title,description:lesson.description || '',resources:links.filter(link=>link.class===classId && !link.assignment && !link.content && isPublished(link.publicationStatus) && isSharedResourceAudience(link.audience)).map(link=>({id:link.id,title:link.title,url:link.url,file:link.type==='file'||link.url.includes('idrivee2.com')||link.url.includes('epixum-javascript-storage'),filename:link.url.split('/').pop()?.split('?')[0] || ''}))};
}
