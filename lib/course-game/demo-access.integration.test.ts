import {expect,it} from 'vitest';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import {readCourseGame} from './service';
import {readBoardContent} from './board-service';

// Explicit, read-only verification of the populated cohort using the student's permissions.
it.skipIf(process.env.COURSE_GAME_DEMO_CHECK!=='1')('Carlos puede leer los ocho encuentros, guías y misiones',async()=>{
 dotenv.config({path:'.env.local',quiet:true});
 const admin=new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
 await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL||process.env.POCKETBASE_ADMIN_EMAIL!,process.env.POCKETBASE_SUPERUSER_PASSWORD||process.env.POCKETBASE_ADMIN_PASSWORD!);
 const student=await admin.collection('users').impersonate('xjmy75hqrv2nvee',60);
 student.autoCancellation(false);
 try {
  const courseId='5wdbs1o1p22vszm';
  const game=await readCourseGame(student,courseId);
  expect(game?.places).toHaveLength(8);
  expect(game?.missions).toHaveLength(8);
  expect(game?.enabledClassIds).toHaveLength(8);
  for(const place of game!.places){
   expect(game?.enabledClassIds).toContain(place.id);
   const board=await readBoardContent(student,courseId,place.id);
   expect(board.description).toContain('Actividad práctica');
  }
  const guides=await student.collection('course_contents').getFullList({filter:student.filter('course = {:course}',{course:courseId})});
  expect(guides).toHaveLength(8);
 }finally{student.authStore.clear();admin.authStore.clear();}
},30000);
