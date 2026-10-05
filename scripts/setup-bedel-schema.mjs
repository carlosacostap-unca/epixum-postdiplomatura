import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { applyBedelSchema } from './bedel-schema.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');
const pb = new PocketBase(url);
pb.autoCancellation(false);
try {
  await pb.collection('_superusers').authWithPassword(email, password);
  const inventory = async () => Object.fromEntries(await Promise.all([
    ['users', 'id,role'], ['courses', 'id,teachers,students'], ['course_enrollments', 'id,course,student'],
  ].map(async ([name, fields]) => {
    const records = await pb.collection(name).getFullList({ fields, sort: 'id' });
    return [name, { count: records.length, digest: createHash('sha256').update(JSON.stringify(records)).digest('hex') }];
  })));
  const before = await inventory();
  const beforeSchema = await pb.collections.getFullList();
  const backup = `backups/pocketbase/bedel-schema-${Date.now()}.json`;
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(backup, JSON.stringify({ schema: beforeSchema, inventory: before }, null, 2), { flag: 'wx' });
  await applyBedelSchema(pb);
  const after = await inventory();
  const afterSchema = await pb.collections.getFullList();
  const unchangedSchemas = beforeSchema.filter(c => c.name !== 'course_bedels').every(c =>
    JSON.stringify(c) === JSON.stringify(afterSchema.find(candidate => candidate.id === c.id)));
  if (JSON.stringify(before) !== JSON.stringify(after) || !unchangedSchemas) {
    throw new Error('El inventario o esquema previo cambió durante la migración; revisar el respaldo.');
  }
  console.log(JSON.stringify({ target: new URL(url).host, backup, inventoryUnchanged: true, otherSchemasUnchanged: true, counts: Object.fromEntries(Object.entries(after).map(([name, value]) => [name, value.count])) }));
} catch (error) {
  console.error('No se completó la migración de bedeles:', error.status || '', error.message);
  process.exitCode = 1;
}
