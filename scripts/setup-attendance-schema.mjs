import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyAttendanceSchema } from './attendance-schema.mjs';

const pb = await testAdmin();
const inventory = async () => Object.fromEntries(await Promise.all(
  ['users', 'courses', 'course_enrollments', 'interactive_sessions', 'interactive_participants'].map(async name => [name, (await pb.collection(name).getFullList({ fields: 'id', sort: 'id' })).map(r => r.id)]),
));
const before = await inventory();
await mkdir('backups/pocketbase', { recursive: true });
const backup = `backups/pocketbase/attendance-schema-${Date.now()}.json`;
await writeFile(backup, JSON.stringify({ schema: await pb.collections.getFullList(), inventory: before }, null, 2), { flag: 'wx' });
await applyAttendanceSchema(pb);
if (JSON.stringify(before) !== JSON.stringify(await inventory())) throw new Error('El inventario cambió; revisar antes de continuar.');
console.log(JSON.stringify({ backup, inventoryUnchanged: true, coursesEnabled: 0 }));
