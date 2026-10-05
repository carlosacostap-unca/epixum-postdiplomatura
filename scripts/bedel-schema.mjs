const ADMIN = '@request.auth.role = "admin"';
export const BEDEL_RULES = {
  listRule: `${ADMIN} || (@request.auth.id != "" && @request.auth.verified = true && email:lower = @request.auth.email:lower)`,
  viewRule: `${ADMIN} || (@request.auth.id != "" && @request.auth.verified = true && email:lower = @request.auth.email:lower)`,
  createRule: ADMIN,
  updateRule: ADMIN,
  deleteRule: ADMIN,
};

export async function applyBedelSchema(pb) {
  const courses = await pb.collections.getOne('courses');
  const fields = [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, cascadeDelete: true, maxSelect: 1 },
    { name: 'email', type: 'email', required: true },
    { name: 'firstName', type: 'text', required: true, min: 1, max: 120 },
    { name: 'lastName', type: 'text', required: true, min: 1, max: 120 },
  ];
  const index = 'CREATE UNIQUE INDEX idx_course_bedels_email ON course_bedels (course, email COLLATE NOCASE)';
  let existing;
  try { existing = await pb.collections.getOne('course_bedels'); }
  catch (error) { if (error?.status !== 404) throw error; }
  if (!existing) return pb.collections.create({ name: 'course_bedels', type: 'base', fields, indexes: [index], ...BEDEL_RULES });
  const merged = [...existing.fields];
  for (const field of fields) {
    const i = merged.findIndex(candidate => candidate.name === field.name);
    if (i < 0) merged.push(field);
    else merged[i] = { ...merged[i], ...field };
  }
  const indexes = [...(existing.indexes || []).filter(value => !value.includes('idx_course_bedels_email')), index];
  return pb.collections.update(existing.id, { fields: merged, indexes, ...BEDEL_RULES });
}
