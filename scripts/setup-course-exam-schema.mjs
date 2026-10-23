import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyCourseExamSchema } from './course-exam-schema.mjs';
try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/course-exams-schema-${Date.now()}.json`, JSON.stringify(await pb.collections.getFullList(), null, 2), { flag: 'wx' });
  await applyCourseExamSchema(pb);
  console.log('Parciales: esquema aplicado con respaldo; cursos existentes sin activar.');
} catch (error) { console.error('Falló la migración de parciales:', error.status, error.message, JSON.stringify(error.response?.data || {})); process.exitCode = 1; }
