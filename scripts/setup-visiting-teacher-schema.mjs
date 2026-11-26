import { loadEnvFile } from 'node:process';
import PocketBase from 'pocketbase';

loadEnvFile('.env.local');
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
const collection = 'course_visiting_teachers';
const admin = '@request.auth.role = "admin"';
const read = `${admin} || (@request.auth.verified = true && visitor = @request.auth.id)`;
const rules = { listRule: read, viewRule: read, createRule: admin, deleteRule: admin, updateRule: null };

try {
  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,
    process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD,
  );
  const existing = await pb.collections.getOne(collection).catch(error => {
    if (error.status !== 404) throw error;
    return null;
  });
  if (existing) {
    if (Object.entries(rules).some(([name, value]) => existing[name] !== value)) {
      throw new Error('La colección existente tiene reglas distintas. Revisá el esquema antes de continuar.');
    }
  } else {
    const [courses, users] = await Promise.all([pb.collections.getOne('courses'), pb.collections.getOne('users')]);
    await pb.collections.create({
      name: collection,
      type: 'base',
      fields: [
        { name: 'course', type: 'relation', collectionId: courses.id, maxSelect: 1, required: true, cascadeDelete: true },
        { name: 'visitor', type: 'relation', collectionId: users.id, maxSelect: 1, required: true, cascadeDelete: true },
      ],
      indexes: [`CREATE UNIQUE INDEX idx_course_visiting_teachers ON ${collection} (course, visitor)`],
      ...rules,
    });
  }
  console.log(`${collection} disponible en ${new URL(pb.baseURL).hostname}`);
} catch (error) {
  console.error('No se pudo instalar la asignación de docentes visitantes.', error.status || '', error.message);
  process.exitCode = 1;
}
