'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { authorizeCourseGame } from './service';
import { saveSofiaProgress } from './sofia-service';
import type { SaveSofia } from './sofia';
export async function saveSofiaAction(courseId:string,input:unknown):Promise<Awaited<ReturnType<SaveSofia>>> {
 try {
  const pb=await createServerClient();
  if(!await authorizeCourseGame(pb,courseId)) throw new Error('Acceso no autorizado');
  await saveSofiaProgress(pb,await createServiceClient(),courseId,input);
  return {success:true};
 } catch {return {success:false,error:'No pudimos guardar. Tus respuestas siguen aquí: revisá la conexión y reintentá antes de salir.'};}
}
