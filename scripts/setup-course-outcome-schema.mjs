import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyCourseOutcomeSchema } from './course-outcome-schema.mjs';

async function main() {
  const pb = await testAdmin();
  await pb.health.check();
  const collections = await pb.collections.getFullList();
  const before = await pb.collection('courses').getFullList({ fields: 'id,outcomesEnabled', sort: 'id' });
  await mkdir('backups/pocketbase', { recursive: true });
  const backup = `backups/pocketbase/course-outcomes-${Date.now()}.json`;
  await writeFile(backup, JSON.stringify({ collections, courses: before }, null, 2), { flag: 'wx' });
  await applyCourseOutcomeSchema(pb);
  const after = await pb.collection('courses').getFullList({ fields: 'id,outcomesEnabled', sort: 'id' });
  if (JSON.stringify(before.map(c => [c.id, Boolean(c.outcomesEnabled)])) !== JSON.stringify(after.map(c => [c.id, Boolean(c.outcomesEnabled)]))) throw new Error('Cambió el inventario o la habilitación de cursos. Revisar respaldo.');
  console.log(JSON.stringify({ backup, coursesUnchanged: true, enabledAutomatically: false }));
}
main().catch(error => { console.error(JSON.stringify({ error: 'No se pudo aplicar el esquema de resultados.', status: error.status || 0, cause: error.originalError?.cause?.code || error.message })); process.exitCode = 1; });
