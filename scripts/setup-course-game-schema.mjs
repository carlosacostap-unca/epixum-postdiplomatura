import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyCourseGameSchema } from './course-game-schema.mjs';

async function main() {
  const pb = await testAdmin();
  await pb.health.check();
  const schema = await pb.collections.getFullList();
  await mkdir('backups/pocketbase', { recursive: true });
  const backup = `backups/pocketbase/course-game-${Date.now()}.json`;
  await writeFile(backup, JSON.stringify({ schema }, null, 2), { flag: 'wx' });
  await applyCourseGameSchema(pb);
  console.log(JSON.stringify({ backup, schemaReady: true, studentRecordsWritten: false }));
}
main().catch(() => { console.error('No se pudo preparar el esquema del juego. No se muestran datos ni credenciales.'); process.exitCode = 1; });
