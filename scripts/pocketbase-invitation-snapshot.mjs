import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');

const label = (process.argv[2] || 'snapshot').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
const schemaNames = [
  'courses',
  'course_enrollments',
  'course_enrollment_invitations',
  'course_enrollment_attempts',
  'course_weeks',
  'classes',
  'assignments',
  'inquiries',
];
const countNames = ['users', ...schemaNames];
const pb = new PocketBase(url);
pb.autoCancellation(false);

function isNotFound(error) {
  return error?.status === 404;
}

function digestIds(records) {
  const ids = records.map((record) => record.id).sort();
  return createHash('sha256').update(ids.join('\n')).digest('hex');
}

function safeSchema(collection) {
  if (!collection) return null;
  return {
    id: collection.id,
    name: collection.name,
    type: collection.type,
    listRule: collection.listRule,
    viewRule: collection.viewRule,
    createRule: collection.createRule,
    updateRule: collection.updateRule,
    deleteRule: collection.deleteRule,
    indexes: collection.indexes || [],
    fields: (collection.fields || []).map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required,
      hidden: field.hidden,
      collectionId: field.collectionId,
      cascadeDelete: field.cascadeDelete,
      maxSelect: field.maxSelect,
      values: field.values,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      onCreate: field.onCreate,
      onUpdate: field.onUpdate,
    })),
  };
}

async function getSchema(name) {
  try {
    return safeSchema(await pb.collections.getOne(name));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function getInventory(name) {
  try {
    const records = await pb.collection(name).getFullList({ fields: 'id' });
    return { count: records.length, idDigest: digestIds(records) };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

await pb.collection('_superusers').authWithPassword(email, password);
const schemaEntries = await Promise.all(schemaNames.map(async (name) => [name, await getSchema(name)]));
const inventoryEntries = await Promise.all(countNames.map(async (name) => [name, await getInventory(name)]));
const courses = await pb.collection('courses').getFullList({ fields: 'id,enrollmentMode,organizationMode' });
const modeCounts = courses.reduce((result, course) => {
  const enrollmentMode = course.enrollmentMode || 'sin_configurar';
  const organizationMode = course.organizationMode || 'sin_configurar';
  result.enrollment[enrollmentMode] = (result.enrollment[enrollmentMode] || 0) + 1;
  result.organization[organizationMode] = (result.organization[organizationMode] || 0) + 1;
  return result;
}, { enrollment: {}, organization: {} });

const generatedAt = new Date().toISOString();
const snapshot = {
  generatedAt,
  targetHost: new URL(url).host,
  label,
  inventory: Object.fromEntries(inventoryEntries),
  modeCounts,
  schemas: Object.fromEntries(schemaEntries),
};
const directory = path.resolve('backups', 'pocketbase');
await mkdir(directory, { recursive: true });
const filename = `${generatedAt.replace(/[:.]/g, '-')}-${label}.json`;
const outputPath = path.join(directory, filename);
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });

process.stdout.write(`${JSON.stringify({ outputPath, generatedAt, inventory: snapshot.inventory, modeCounts }, null, 2)}\n`);
