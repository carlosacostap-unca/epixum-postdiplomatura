import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { buildCourseRoleAudit, compareCourseRoleAudits } from './course-role-audit.mjs';
import { applyCourseRoleRules } from './course-role-schema.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(email, password);

async function optionalFullList(name, options) {
  try { return await pb.collection(name).getFullList(options); }
  catch (error) { if (error?.status === 404) return []; throw error; }
}

async function audit() {
  const [users, courses, enrollments, invitations] = await Promise.all([
    pb.collection('users').getFullList({ fields: 'id' }),
    pb.collection('courses').getFullList({ fields: 'id,teachers,students' }),
    pb.collection('course_enrollments').getFullList({ fields: 'id,course,student,invitation,created,updated' }),
    optionalFullList('course_enrollment_invitations', { fields: 'id' }),
  ]);
  return buildCourseRoleAudit({ users, courses, enrollments, invitations });
}

const before = await audit();
if (!before.compatible) {
  process.stdout.write(`${JSON.stringify({ phase: 'preflight', ...before }, null, 2)}\n`);
  throw new Error('La auditoría detectó conflictos o relaciones inválidas; no se modificó el esquema.');
}

const result = await applyCourseRoleRules(pb);
const after = await audit();
const comparison = compareCourseRoleAudits(before, after);
if (!after.compatible || !comparison.equal) throw new Error('La verificación posterior no coincide con la auditoría previa.');

process.stdout.write(`${JSON.stringify({
  targetHost: new URL(url).host,
  updatedCollections: result.updatedCollections,
  preserved: comparison.equal,
  counts: after.counts,
  digests: after.digests,
}, null, 2)}\n`);
