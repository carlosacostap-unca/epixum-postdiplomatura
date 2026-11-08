import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewScheduleReader,PREVIEW_COURSE_ID} from './course-game-preview-server.mjs';
test('consulta cada vez y solo devuelve el calendario visible del curso piloto',async()=>{
  let calls=0;
  const authStore={isValid:false};
  const client={authStore,autoCancellation(){},filter:(q,v)=>JSON.stringify({q,v}),collection:name=>name==='_superusers'?{async authWithPassword(){authStore.isValid=true;}}:{async getFullList(options){
    calls++;
    assert.equal(options.cache,'no-store');
    assert.match(options.filter,new RegExp(PREVIEW_COURSE_ID));
    return [
      {id:'a',course:PREVIEW_COURSE_ID,title:'Título '+calls,date:`2026-11-${10+calls} 23:00:00.000Z`,publicationStatus:'published',secret:'omitido'},
      {id:'draft',course:PREVIEW_COURSE_ID,publicationStatus:'draft'},
      {id:'future',course:PREVIEW_COURSE_ID,publicationStatus:'scheduled',publishAt:'2999-01-01'},
      {id:'other',course:'another',publicationStatus:'published'},
    ];
  }}};
  const read=createPreviewScheduleReader({NEXT_PUBLIC_POCKETBASE_URL:'https://example.test',POCKETBASE_ADMIN_EMAIL:'test',POCKETBASE_ADMIN_PASSWORD:'test'},()=>client);
  const first=await read(),second=await read();
  assert.equal(calls,2); assert.equal(first.classes.length,1);
  assert.equal(second.classes[0].title,'Título 2');
  assert.deepEqual(Object.keys(first.classes[0]).sort(),['date','id','title']);
  assert.ok(Number.isFinite(first.serverNow));
});
test('no devuelve copias locales si falta configuración o falla PocketBase',async()=>{
  await assert.rejects(createPreviewScheduleReader({})());
  const read=createPreviewScheduleReader({NEXT_PUBLIC_POCKETBASE_URL:'https://example.test',POCKETBASE_ADMIN_EMAIL:'test',POCKETBASE_ADMIN_PASSWORD:'test'},()=>({autoCancellation(){},authStore:{isValid:true},filter:()=>'',collection:()=>({getFullList:async()=>{throw new Error('Offline');}})}));
  await assert.rejects(read(),/Offline/);
});
