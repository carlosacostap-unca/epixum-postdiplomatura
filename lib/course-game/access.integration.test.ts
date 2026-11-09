import { expect, it } from 'vitest';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { readCourseGame } from './service';
import { readGameWelcome } from './onboarding-service';

// Explicit read-only deployment check, never run against PocketBase in the unit suite.
it.skipIf(process.env.COURSE_GAME_ACCESS_CHECK !== '1')('abre el curso y su bienvenida con la identidad invitada real', async () => {
  dotenv.config({path:'.env.local',quiet:true});
  const service=new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  service.autoCancellation(false);
  await service.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
  const courseId='5wdbs1o1p22vszm';
  const course=await service.collection('courses').getOne(courseId,{fields:'id,status,guestStudents'});
  expect(course.status).toBe('borrador');
  expect(course.guestStudents.length).toBeGreaterThan(0);
  const student=await service.collection('users').impersonate(course.guestStudents[0],60);
  student.autoCancellation(false);
  try {
    const game=await readCourseGame(student,courseId);
    expect(game?.courseId).toBe(courseId);
    expect(game?.places).toHaveLength(8);
    const welcome=await readGameWelcome(student,service,courseId);
    expect(welcome).toHaveProperty('tourStep');
    expect(welcome).toHaveProperty('profile');
    for(const name of ['course_game_onboarding','course_game_tour_steps']) {
      const schema=await service.collections.getOne(name);
      for(const rule of ['listRule','viewRule','createRule','updateRule','deleteRule']) expect(schema[rule]).toBeNull();
    }
  } finally {student.authStore.clear();service.authStore.clear();}
},30000);

it.skipIf(process.env.COURSE_GAME_ACCESS_CHECK !== '1')('abre el acceso real del docente y reserva el escritorio a Carlos',async()=>{
 dotenv.config({path:'.env.local',quiet:true});
 const admin=new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);admin.autoCancellation(false);
 await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL||process.env.POCKETBASE_ADMIN_EMAIL!,process.env.POCKETBASE_SUPERUSER_PASSWORD||process.env.POCKETBASE_ADMIN_PASSWORD!);
 const teacher=await admin.collection('users').impersonate('jz8xc7htg1ra6wr',60);teacher.autoCancellation(false);
 try {
  const game=await readCourseGame(teacher,'5wdbs1o1p22vszm');
  expect(game?.canPresent).toBe(true);
  expect(game?.enabledClassIds).toEqual(['cf8xxh363j2pglb']);
  expect(game?.places).toHaveLength(8);
  await expect(readGameWelcome(teacher,admin,'5wdbs1o1p22vszm')).resolves.toHaveProperty('character');
 }finally {teacher.authStore.clear();admin.authStore.clear();}
},30000);
