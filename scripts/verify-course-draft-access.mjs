import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
dotenv.config({path:'.env.local',quiet:true});
const pb=new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
await pb.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD);
const courseId=process.argv[2];
if(!courseId) throw new Error('Indicá el curso borrador que querés verificar.');
const course=await pb.collection('courses').getOne(courseId,{fields:'id,status,teachers,guestStudents'});
assert.equal(course.status,'borrador');
assert.ok(course.guestStudents.length && course.teachers.length);
const excluded=[...course.guestStudents,...course.teachers];
const enrollments=await pb.collection('course_enrollments').getFullList({filter:pb.filter('course = {:course}',{course:courseId}),fields:'student'});
let regular=enrollments.find(e=>!excluded.includes(e.student))?.student;
if(!regular) regular=(await pb.collection('users').getFirstListItem(pb.filter('role = "estudiante" && id != {:guest} && id != {:teacher}',{guest:course.guestStudents[0],teacher:course.teachers[0]}),{fields:'id'})).id;
const classes=await pb.collection('classes').getFullList({filter:pb.filter('course = {:course}',{course:courseId}),fields:'id'});
const results=[];
for(const [profile,id,allowed] of [['invitado',course.guestStudents[0],true],['docente',course.teachers[0],true],['estudiante común',regular,false]]) {
  // Short-lived identity tokens stay in memory; only read requests follow.
  const client=await pb.collection('users').impersonate(id,60);
  const listed=await client.collection('courses').getList(1,1,{filter:client.filter('id = {:id}',{id:courseId}),fields:'id'});
  assert.equal(listed.totalItems,allowed?1:0,profile+' listado');
  let visible=false;
  try {await client.collection('courses').getOne(courseId,{fields:'id'});visible=true;} catch(e){assert.equal(e.status,404);}
  assert.equal(visible,allowed,profile+' enlace directo');
  const lessons=await client.collection('classes').getList(1,1,{filter:client.filter('course = {:id}',{id:courseId}),fields:'id'});
  if(!allowed) {
    assert.equal(lessons.totalItems,0,'contenido oculto');
    if(classes[0]) {
      await assert.rejects(client.collection('classes').getOne(classes[0].id,{fields:'id'}),e=>e.status===404);
    }
    const memberships=await client.collection('course_enrollments').getList(1,1,{filter:client.filter('course = {:id}',{id:courseId}),fields:'id'});
    assert.equal(memberships.totalItems,0);
  } else assert.ok(lessons.totalItems>0,profile+' clases');
  results.push({profile,courseVisible:visible,visibleClasses:lessons.totalItems});
  client.authStore.clear();
}
console.log(JSON.stringify({verified:true,results},null,2));
