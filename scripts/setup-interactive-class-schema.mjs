import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { applyInteractiveClassSchema } from './interactive-class-schema.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');
const pb = new PocketBase(url);
pb.autoCancellation(false);
try {
  await pb.collection('_superusers').authWithPassword(email, password);
  await applyInteractiveClassSchema(pb);
  const [courses, lessons] = await Promise.all([pb.collections.getOne('courses'), pb.collections.getOne('interactive_lessons')]);
  if (!courses.fields.some((field) => field.name === 'interactiveClassesEnabled') || !lessons.viewRule?.includes('course.teachers')) throw new Error('La verificación del esquema no coincide.');
  console.log('Esquema de clases interactivas configurado y verificado. No se habilitaron cursos ni se modificaron materiales.');
} catch (error) {
  console.error(`No se pudo configurar el esquema (${error?.status || 'sin estado'}): ${error?.message || 'Error desconocido'}`);
  if (error?.response?.data) console.error(JSON.stringify(error.response.data));
  process.exitCode = 1;
}
