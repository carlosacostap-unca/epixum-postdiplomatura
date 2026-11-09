export const gamePrivateRules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
async function ensure(pb, name, fields, indexes) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (error) { if (error.status !== 404) throw error; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) {
    const index = merged.findIndex(item => item.name === field.name);
    if (index < 0) merged.push(field); else merged[index] = { ...merged[index], ...field };
  }
  const data = { fields: merged, ...gamePrivateRules, indexes: [...new Set([...(current?.indexes || []), ...indexes])] };
  return current ? pb.collections.update(current.id, data) : pb.collections.create({ name, type: 'base', ...data });
}
export async function applyCourseGameSchema(pb) {
  const settings = await pb.settings.getAll();
  if (!settings.batch?.enabled || settings.batch.maxRequests < 2) throw new Error('El onboarding requiere batch con al menos dos operaciones.');
  const users = await pb.collections.getOne('users');
  const courses = await pb.collections.getOne('courses');
  for (const name of ['firstName', 'lastName', 'dni', 'phone', 'birthDate']) if (!users.fields.some(field => field.name === name)) throw new Error('Faltan campos del perfil existente.');
  const onboarding = await ensure(pb, 'course_game_onboarding', [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
    { name: 'student', type: 'relation', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
    { name:'sofiaProgress', type:'json', required:false, maxSize:16384 },
    { name: 'character', type: 'json', required: true, maxSize: 4096 },
    { name: 'contactEmail', type: 'email', required: true },
    { name: 'profileConfirmedAt', type: 'date', required: true },
  ], ['CREATE UNIQUE INDEX idx_game_onboarding_student ON course_game_onboarding (course, student)']);
  await ensure(pb, 'course_game_tour_steps', [
    { name: 'onboarding', type: 'relation', required: true, collectionId: onboarding.id, maxSelect: 1, cascadeDelete: true },
    { name: 'version', type: 'number', required: true, min: 1, onlyInt: true },
    { name: 'step', type: 'number', required: true, min: 1, max: 5, onlyInt: true },
  ], ['CREATE UNIQUE INDEX idx_game_tour_step ON course_game_tour_steps (onboarding, version, step)']);
}
