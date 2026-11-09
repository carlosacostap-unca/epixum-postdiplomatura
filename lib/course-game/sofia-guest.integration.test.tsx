import { expect,it,vi } from 'vitest';
import { act,fireEvent,render,screen,waitFor } from '@testing-library/react';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { isDeepStrictEqual } from 'node:util';
import { readSofiaProgress,saveSofiaProgress } from './sofia-service';
import { INITIAL_SOFIA,SOFIA_QUESTIONS,SOFIA_ACTIONS,type SofiaProgress } from './sofia';
import { readCourseGame } from './service';
import { DEFAULT_CHARACTER } from './onboarding';
import type { VillageState } from '@/components/course-game/phaser/village-engine';
import CourseMissionMap from '@/components/course-game/CourseMissionMap';
const scene=vi.hoisted(()=>({current:null as VillageState|null}));
// Only rendering and the future class's clock are simulated; authorization, reads and writes use real PocketBase.
vi.mock('@/components/course-game/PhaserVillage',()=>({default:(props:VillageState)=>{scene.current=props;return <div/>;}}));
vi.mock('@/components/course-game/useGameSchedule',()=>({useGameSchedule:()=>({clock:null,isOpen:()=>true})}));
it.skipIf(process.env.RUN_SOFIA_GUEST_WRITE_TEST!=='1')('guarda con el invitado, recupera en sesiones nuevas y restaura el avance original',async()=>{
 dotenv.config({path:'.env.local',quiet:true});
 const admin=new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);admin.autoCancellation(false);
 await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL||process.env.POCKETBASE_ADMIN_EMAIL!,process.env.POCKETBASE_SUPERUSER_PASSWORD||process.env.POCKETBASE_ADMIN_PASSWORD!);
 const course='5wdbs1o1p22vszm';
 const user=await admin.collection('users').getFirstListItem(admin.filter('email = {:email}',{email:'carlosacostap@sfvc.edu.ar'}),{fields:'id'});
 const enrollment=await admin.collection('courses').getOne(course,{fields:'id,guestStudents'});
 expect(enrollment.guestStudents).toContain(user.id);
 const row=await admin.collection('course_game_onboarding').getFirstListItem(admin.filter('course = {:course} && student = {:student}',{course,student:user.id}),{fields:'id,sofiaProgress'});
 const original=structuredClone(row.sofiaProgress ?? null);
 const marker='[Prueba automática Sofía '+Date.now()+']';
 const draft:SofiaProgress={...INITIAL_SOFIA,clues:Object.keys(SOFIA_QUESTIONS),available:'6',needed:'12',verdict:'adaptar',actions:SOFIA_ACTIONS.slice(0,2),reflection:marker+' Revisaría los conocimientos previos y priorizaría los temas con Sofía.',reviewed:true,hintLevel:2};
 const revised={...draft,reflection:marker+' Primero haría un diagnóstico; luego ajustaría el plan a las seis horas disponibles.',reviewed:false};
 let student:PocketBase|undefined;let view:ReturnType<typeof render>|undefined;let attempted=false;
 try {
  student=await admin.collection('users').impersonate(user.id,180);student.autoCancellation(false);
  expect(student.authStore.record?.id).toBe(user.id);
  attempted=true;await saveSofiaProgress(student,admin,course,draft);
  const persisted=await admin.collection('course_game_onboarding').getOne(row.id,{fields:'sofiaProgress'});
  expect(persisted.sofiaProgress).toEqual(draft);
  student.authStore.clear();
  student=await admin.collection('users').impersonate(user.id,180);student.autoCancellation(false);
  const loaded=await readSofiaProgress(student,admin,course);expect(loaded).toEqual(draft);
  const game=await readCourseGame(student,course);expect(game).not.toBeNull();
  const activeStudent=student;
  view=render(<CourseMissionMap game={game!} character={DEFAULT_CHARACTER} initialSofia={loaded} saveSofia={async value=>{await saveSofiaProgress(activeStudent,admin,course,value);return {success:true};}}/>);
  act(()=>scene.current?.onEnter?.());act(()=>scene.current?.onRoom?.(0));act(()=>scene.current?.onNotebook?.());
  expect(screen.getByLabelText('Horas disponibles')).toHaveValue(6);
  expect(screen.getByLabelText('Horas estimadas necesarias')).toHaveValue(12);
  expect(screen.getByLabelText('Usarla como punto de partida y adaptarla')).toBeChecked();
  expect(screen.getByLabelText(SOFIA_ACTIONS[0])).toBeChecked();
  expect(screen.getByLabelText('4. Tu recomendación para Sofía')).toHaveValue(draft.reflection);
  expect(screen.getByText('Conversar con Sofía · 3/3 datos')).toBeVisible();
  fireEvent.change(screen.getByLabelText('4. Tu recomendación para Sofía'),{target:{value:revised.reflection}});
  await waitFor(()=>expect(screen.getAllByText('Guardado en PocketBase').length).toBeGreaterThan(0),{timeout:15000});
  fireEvent.click(screen.getByRole('button',{name:'Cerrar y volver al juego'}));
  fireEvent.click(screen.getByRole('button',{name:/Menú/}));
  fireEvent.click(screen.getByRole('button',{name:/Mi diario/}));
  expect(screen.getByText(revised.reflection)).toBeVisible();
  view.unmount();view=undefined;student.authStore.clear();
  student=await admin.collection('users').impersonate(user.id,180);student.autoCancellation(false);
  expect(await readSofiaProgress(student,admin,course)).toEqual(revised);
 } finally {
  view?.unmount();student?.authStore.clear();
  if(attempted){
   const current=await admin.collection('course_game_onboarding').getOne(row.id,{fields:'sofiaProgress'});
   if(isDeepStrictEqual(current.sofiaProgress,draft)||isDeepStrictEqual(current.sofiaProgress,revised)){
    await admin.collection('course_game_onboarding').update(row.id,{sofiaProgress:original});
    const restored=await admin.collection('course_game_onboarding').getOne(row.id,{fields:'sofiaProgress'});
    expect(restored.sofiaProgress ?? null).toEqual(original);
   }else if(!isDeepStrictEqual(current.sofiaProgress ?? null,original))throw new Error('Avance concurrente detectado: se conservó sin sobrescribirlo.');
  }
  admin.authStore.clear();
 }
},90000);
