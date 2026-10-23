// Questions and answer keys live in the private input file, never in this public repository.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
try {
  const file = process.argv[2];
  if (!file) throw new Error('Indicá el JSON privado del parcial como argumento.');
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (data.status !== 'draft' || data.opensAt || data.closesAt || data.questions?.length !== 20) throw new Error('Se espera un borrador de 20 preguntas, sin programación.');
  if (new Set(data.questions.map(q => q.id)).size !== 20 || data.questions.some(q => q.options?.length !== 4 || !q.options.some(o => o.id === q.correctOptionId))) throw new Error('Preguntas inválidas.');
  const pb = await testAdmin();
  const course = await pb.collection('courses').getOne('6taf9vkwwi8oxlz');
  if (course.title !== 'Diseño de Software y Patrones') throw new Error('El curso no coincide con el solicitado.');
  let existing;
  try { existing = await pb.collection('course_exams').getOne('dspfirstexam001'); } catch (e) { if (e.status !== 404) throw e; }
  if (existing && (existing.course !== course.id || existing.status !== 'draft' || JSON.stringify(canonical(existing.questions)) !== JSON.stringify(canonical(data.questions)))) throw new Error('Ya hay un parcial diferente con este ID; no se sobrescribió.');
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/course-exams-seed-${Date.now()}.json`, JSON.stringify({ course: { id: course.id, examsEnabled: course.examsEnabled || false }, existing: existing || null }, null, 2), { flag: 'wx' });
  const exam = existing || await pb.collection('course_exams').create({ ...data, id: 'dspfirstexam001', course: course.id });
  await pb.collection('courses').update(course.id, { examsEnabled: true });
  const saved = await pb.collection('course_exams').getOne(exam.id);
  console.log(JSON.stringify({ course: course.title, courseId: course.id, examsEnabled: true, id: saved.id, title: saved.title, status: saved.status, questions: saved.questions.length, opensAt: saved.opensAt, closesAt: saved.closesAt }, null, 2));
} catch (error) { console.error('No se completó la carga:', error.status || '', error.message, JSON.stringify(error.response?.data || {})); process.exitCode = 1; }
