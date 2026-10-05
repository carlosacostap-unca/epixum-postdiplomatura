import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyResourcePublicationSchema } from './resource-publication-schema.mjs';

try {
  const pb = await testAdmin();
  const names = ['assignments', 'links'];
  const inventory = async () => Object.fromEntries(await Promise.all(names.map(async name => [
    name, (await pb.collection(name).getFullList({ sort: 'id' })).map(record => {
      // A new optional select appears empty without changing existing data.
      const { publicationStatus, ...rest } = record;
      return { ...rest, publicationStatus: publicationStatus || '' };
    }),
  ])));
  const schema = await pb.collections.getFullList();
  const before = await inventory();
  const backup = `backups/pocketbase/resource-publication-${Date.now()}.json`;
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(backup, JSON.stringify({ schema, records: before }, null, 2), { flag: 'wx' });
  await applyResourcePublicationSchema(pb);
  assert.deepEqual(await inventory(), before, 'La migración debe conservar los registros');
  const first = await pb.collections.getFullList();
  await applyResourcePublicationSchema(pb);
  assert.deepEqual(await pb.collections.getFullList(), first, 'La migración debe ser idempotente');
  console.log(JSON.stringify({ backup, recordsUnchanged: true, idempotent: true, counts: Object.fromEntries(names.map(name => [name, before[name].length])) }));
} catch (error) {
  console.error('No se completó la migración de publicación:', error.status || '', error.code === 'ERR_ASSERTION' ? 'La verificación de conservación o idempotencia falló; revisar el respaldo local.' : error.message);
  process.exitCode = 1;
}
