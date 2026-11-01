import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applySurveyTargetingSchema } from './survey-targeting-schema.mjs';

const pb = await testAdmin(); await pb.health.check();
const names = ['course_surveys', 'course_survey_participations', 'course_survey_responses'];
const inventory = async () => Object.fromEntries(await Promise.all(names.map(async name => [name, (await pb.collection(name).getFullList({ fields: 'id', sort: 'id' })).map(record => record.id)])));
const before = await inventory();
await mkdir('backups/pocketbase', { recursive: true });
const backup = `backups/pocketbase/survey-targeting-${Date.now()}.json`;
await writeFile(backup, JSON.stringify({ collections: await pb.collections.getFullList(), inventory: before }, null, 2), { flag: 'wx' });
await applySurveyTargetingSchema(pb);
if (JSON.stringify(before) !== JSON.stringify(await inventory())) throw new Error('Cambió el inventario de encuestas; revisar respaldo.');
console.log(JSON.stringify({ backup, inventoryUnchanged: true }));
