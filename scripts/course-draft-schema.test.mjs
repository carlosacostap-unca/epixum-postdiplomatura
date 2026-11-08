import test from 'node:test';
import assert from 'node:assert/strict';
import {draftSchemaPatches} from './course-draft-schema.mjs';

test('borradores: preserva permisos, protege relaciones y no abre reglas bloqueadas',()=>{
  const schemas=[
    {name:'users',id:'u',fields:[],listRule:null},
    {name:'courses',id:'c',fields:[],listRule:'@request.auth.id != ""',viewRule:'@request.auth.id != ""',updateRule:'@request.auth.role = "admin"'},
    {name:'classes',id:'cl',fields:[{name:'course',collectionId:'c'}],listRule:'publicationStatus = "published"',viewRule:null},
    {name:'links',id:'l',fields:[],listRule:'owner = @request.auth.id'},
  ];
  const patches=draftSchemaPatches(schemas);
  assert.equal(patches[0].collection,'courses');
  assert.match(patches[0].data.updateRule,/@request.body.guestStudents:isset = false/);
  const classes=patches.find(p=>p.collection==='classes').data;
  assert.match(classes.listRule,/publicationStatus = "published"/);
  assert.match(classes.listRule,/course.status != "borrador"/);
  assert.match(classes.listRule,/course.guestStudents.id/);
  assert.equal(classes.viewRule,undefined);
  const links=patches.find(p=>p.collection==='links').data.listRule;
  for(const path of ['class.course','assignment.course','content.course']) assert.ok(links.includes(`${path}.id != ""`));
  const applied=schemas.map(s=>({...s,...patches.find(p=>p.collection===s.name)?.data}));
  assert.deepEqual(draftSchemaPatches(applied),[]);
});
