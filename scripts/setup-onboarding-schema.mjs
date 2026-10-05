import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyOnboardingSchema } from './onboarding-schema.mjs';

const pb = await testAdmin();
const courseId = process.argv.find(value => value.startsWith('--enable-course='))?.split('=')[1];
const course = courseId ? await pb.collection('courses').getOne(courseId) : null;
const inventory = async () => Object.fromEntries(await Promise.all(
  ['users', 'courses', 'course_enrollments', 'course_enrollment_invitations'].map(async name => [name, (await pb.collection(name).getFullList({ fields: 'id', sort: 'id' })).map(r => r.id)]),
));
const before = await inventory();
await mkdir('backups/pocketbase', { recursive: true });
const backup = `backups/pocketbase/onboarding-schema-${Date.now()}.json`;
await writeFile(backup, JSON.stringify({ schema: await pb.collections.getFullList(), inventory: before, course }, null, 2), { flag: 'wx' });
await applyOnboardingSchema(pb);
if (course) await pb.collection('courses').update(course.id, { onboardingEnabled: true });
const after = await inventory();
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('El inventario cambió; revisar antes de continuar.');
console.log(JSON.stringify({ backup, enabledCourse: course?.title || null, inventoryUnchanged: true }));
