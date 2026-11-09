import 'server-only';
import type PocketBase from 'pocketbase';
import { authorizeCourseGame } from './service';
import { INITIAL_SOFIA,sofiaProgressSchema,type SofiaProgress } from './sofia';
async function record(pb:PocketBase,service:PocketBase,courseId:string) {
 const access=await authorizeCourseGame(pb,courseId);
 if(!access) throw new Error('Acceso no autorizado');
 const rows=await service.collection('course_game_onboarding').getList<{id:string;sofiaProgress:unknown}>(1,1,{filter:service.filter('course = {:course} && student = {:student}',{course:courseId,student:access.user.id}),fields:'id,sofiaProgress'});
 return rows.items[0];
}
export async function readSofiaProgress(pb:PocketBase,service:PocketBase,courseId:string):Promise<SofiaProgress> {
 const row=await record(pb,service,courseId);
 return row?.sofiaProgress == null ? {...INITIAL_SOFIA} : sofiaProgressSchema.parse(row.sofiaProgress);
}
export async function saveSofiaProgress(pb:PocketBase,service:PocketBase,courseId:string,input:unknown) {
 const progress=sofiaProgressSchema.parse(input);
 const row=await record(pb,service,courseId);
 if(!row) throw new Error('Completá primero tu personaje');
 await service.collection('course_game_onboarding').update(row.id,{sofiaProgress:progress});
}
