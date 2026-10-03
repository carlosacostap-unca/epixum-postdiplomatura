import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

const scope = '@request.auth.id != "" && course.interactiveClassesEnabled = true && course.teachers.id ?= @request.auth.id';
export const INTERACTIVE_LESSON_RULES = {
  listRule: scope,
  viewRule: scope,
  createRule: `${scope} && (class = "" || class.course = course)`,
  updateRule: `${scope} && @request.body.course:changed = false && (@request.body.class:isset = false || @request.body.class = "" || (@collection.classes.id ?= @request.body.class && @collection.classes.course ?= course))`,
  deleteRule: scope,
};

function mergeFields(current, expected) {
  const fields = [...(current || [])];
  for (const field of expected) {
    const index = fields.findIndex((item) => item.name === field.name);
    if (index < 0) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  return fields;
}

export async function applyInteractiveClassSchema(pb) {
  const courses = await pb.collections.getOne('courses');
  const classes = await pb.collections.getOne('classes');
  await pb.collections.update(courses.id, {
    fields: mergeFields(courses.fields, [{ name: 'interactiveClassesEnabled', type: 'bool', required: false }]),
    updateRule: COURSE_UPDATE_RULE,
  });
  const fields = [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
    { name: 'class', type: 'relation', required: false, collectionId: classes.id, maxSelect: 1, cascadeDelete: false },
    { name: 'title', type: 'text', required: true, min: 1, max: 160 },
    { name: 'description', type: 'text', required: false, max: 2000 },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'ready'] },
    { name: 'material', type: 'json', required: false, maxSize: 200000 },
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
  const indexes = [
    'CREATE INDEX idx_interactive_lessons_course ON interactive_lessons (course, updated)',
    'CREATE INDEX idx_interactive_lessons_class ON interactive_lessons (class)',
  ];
  let current;
  try { current = await pb.collections.getOne('interactive_lessons'); }
  catch (error) { if (error?.status !== 404) throw error; }
  const payload = {
    fields: mergeFields(current?.fields, fields),
    indexes: [...(current?.indexes || []), ...indexes.filter((index) => !current?.indexes?.some((existing) => existing.includes(index.match(/INDEX (\S+)/)[1])))],
    ...INTERACTIVE_LESSON_RULES,
  };
  const collection = current
    ? await pb.collections.update(current.id, payload)
    : await pb.collections.create({ name: 'interactive_lessons', type: 'base', ...payload });
  return { collectionId: collection.id };
}
