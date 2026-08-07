import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !email || !password) {
  throw new Error('Faltan las credenciales de PocketBase en .env.local');
}

const pb = new PocketBase(url);
pb.autoCancellation(false);

await pb.collection('_superusers').authWithPassword(email, password);

const weeks = await pb.collections.getOne('course_weeks');
const numberField = weeks.fields.find((field) => field.name === 'number');
if (!numberField || numberField.type !== 'number') {
  throw new Error('No existe el campo numérico course_weeks.number');
}

if (numberField.min !== 0 || numberField.onlyInt !== true || numberField.required !== false) {
  const fields = weeks.fields.map((field) =>
    field.name === 'number' ? { ...field, required: false, min: 0, onlyInt: true } : field,
  );
  await pb.collections.update(weeks.id, { fields });
}

const updated = await pb.collections.getOne('course_weeks');
const updatedNumber = updated.fields.find((field) => field.name === 'number');
if (updatedNumber?.min !== 0 || updatedNumber?.onlyInt !== true || updatedNumber?.required !== false) {
  throw new Error('PocketBase no confirmó el mínimo 0 para course_weeks.number');
}

console.log('- course_weeks.number admite enteros desde 0');
