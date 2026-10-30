import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyCourseSurveySchema } from './course-survey-schema.mjs';

const pb = await testAdmin();
await pb.health.check();
const collections = await pb.collections.getFullList();
const settings = await pb.settings.getAll();
const before = await pb.collection('courses').getFullList({ fields: 'id,surveysEnabled', sort: 'id' });
await mkdir('backups/pocketbase', { recursive: true });
const backup = `backups/pocketbase/course-surveys-${Date.now()}.json`;
await writeFile(backup, JSON.stringify({ collections, batch: settings.batch, courses: before }, null, 2), { flag: 'wx' });
await applyCourseSurveySchema(pb);
const after = await pb.collection('courses').getFullList({ fields: 'id,surveysEnabled', sort: 'id' });
if (JSON.stringify(before.map(c => [c.id, Boolean(c.surveysEnabled)])) !== JSON.stringify(after.map(c => [c.id, Boolean(c.surveysEnabled)]))) throw new Error('Cambió el inventario o la habilitación; revisar respaldo.');
console.log(JSON.stringify({ backup, coursesUnchanged: true, surveysEnabledByDefault: false }));
