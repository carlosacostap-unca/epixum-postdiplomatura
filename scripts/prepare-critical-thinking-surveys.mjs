import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { testAdmin } from './live-test-fixtures.mjs';
import { CRITICAL_THINKING_COURSE, criticalThinkingSurveys } from './critical-thinking-surveys.mjs';

const pb = await testAdmin(); await pb.health.check();
const course = await pb.collection('courses').getOne(CRITICAL_THINKING_COURSE.id);
if (course.title !== CRITICAL_THINKING_COURSE.title || course.status === 'borrador') throw new Error('El curso activo no coincide con el destino previsto.');
const schema = await pb.collections.getOne('course_surveys');
if (!schema.fields.some(field => field.name === 'audience' && field.type === 'select')) throw new Error('Aplicá primero la migración de destinatarios.');
const filter = pb.filter('course = {:course}', { course: course.id });
const originalSurveys = await pb.collection('course_surveys').getFullList({ filter, sort: 'id' });
if (!course.surveysEnabled && originalSurveys.some(survey => survey.status !== 'draft')) throw new Error('Habilitar encuestas expondría encuestas existentes; revisar antes de continuar.');
const academicDigest = async () => createHash('sha256').update(JSON.stringify(await pb.collection('course_outcomes').getFullList({ filter, sort: 'id' }))).digest('hex');
const academicBefore = await academicDigest();
const originals = new Map(originalSurveys.map(survey => [survey.id, survey]));
const planned = criticalThinkingSurveys().map(template => ({ ...template, id: createHash('sha256').update(`${course.id}:critical-thinking-survey:${template.key}:v1`).digest('hex').slice(0, 15) }));
for (const template of planned) {
  if (template.design.questions.length !== 10 || !template.design.anonymous || template.design.audience !== template.key) throw new Error('Plantilla no válida.');
  const existing = originals.get(template.id);
  if (!existing) continue;
  if (existing.course !== course.id || existing.status !== 'draft' || Object.entries(template.design).some(([key, value]) => !isDeepStrictEqual(existing[key], value))) throw new Error(`El borrador ${template.id} ya fue editado o publicado; no se sobrescribirá.`);
}
await mkdir('backups/pocketbase', { recursive: true });
const backup = `backups/pocketbase/critical-thinking-surveys-${Date.now()}.json`;
await writeFile(backup, JSON.stringify({ course, surveys: originalSurveys, academicDigest: academicBefore }, null, 2), { flag: 'wx' });
const batch = pb.createBatch(); let mutations = 0;
for (const template of planned) if (!originals.has(template.id)) {
  batch.collection('course_surveys').create({ ...template.design, id: template.id, course: course.id, status: 'draft', revision: randomBytes(16).toString('hex') }); mutations++;
}
if (!course.surveysEnabled) { batch.collection('courses').update(course.id, { surveysEnabled: true }); mutations++; }
if (mutations) await batch.send();
const after = await pb.collection('courses').getOne(course.id);
if (!after.surveysEnabled || after.outcomesEnabled !== course.outcomesEnabled || academicBefore !== await academicDigest()) throw new Error('La verificación del curso requiere revisión.');
const summaries = [];
for (const template of planned) {
  const survey = await pb.collection('course_surveys').getOne(template.id);
  if (survey.status !== 'draft' || survey.audience !== template.key || !survey.anonymous || Object.entries(template.design).some(([key, value]) => !isDeepStrictEqual(survey[key], value))) throw new Error('El borrador preparado no coincide con la plantilla.');
  const answers = await pb.collection('course_survey_responses').getList(1, 1, { filter: pb.filter('survey = {:survey}', { survey: survey.id }), fields: 'id' });
  if (answers.totalItems !== 0) throw new Error('Se encontraron respuestas inesperadas en un borrador.');
  summaries.push({ id: survey.id, title: survey.title, audience: survey.audience, status: survey.status, questions: survey.questions.length });
}
console.log(JSON.stringify({ backup, mutations, academicResultsUnchanged: true, outcomesEnabled: after.outcomesEnabled, surveys: summaries }, null, 2));
