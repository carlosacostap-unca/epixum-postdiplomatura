'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { getResourceDownloadUrl } from '@/lib/actions';
import { readBoardContent } from './board-service';
import type { BoardResult } from './board';
export async function loadBoardAction(courseId:string,classId:string):Promise<BoardResult> {
  try {
    const content=await readBoardContent(await createServerClient(),courseId,classId);
    const resources=await Promise.all(content.resources.map(async resource=>{
      if(!resource.file) return resource;
      const result=await getResourceDownloadUrl(resource.id);
      return {...resource,url:result.success ? result.url || '' : ''};
    }));
    return {success:true,content:{...content,resources}};
  } catch { return {success:false,error:'No pudimos cargar esta clase. Revisá la conexión y volvé a intentarlo.'}; }
}
