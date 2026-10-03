const auth = '@request.auth.id != ""';
const enabled = 'course.interactiveClassesEnabled = true';
const teacher = 'course.teachers.id ?= @request.auth.id';
const enrolled = '@collection.course_enrollments.course ?= course && @collection.course_enrollments.student ?= @request.auth.id';
const member = '@collection.interactive_participants.session ?= id && @collection.interactive_participants.student ?= @request.auth.id';
const immutable = (names) => names.map((name) => `@request.body.${name}:changed = false`).join(' && ');
const dates = '@request.body.created:isset = false && @request.body.updated:isset = false';
const relatedTeacher = 'session.course.teachers.id ?= @request.auth.id';
const relatedEnrolled = '@collection.course_enrollments.course ?= session.course && @collection.course_enrollments.student ?= @request.auth.id';
const relatedScope = `${auth} && session.course.interactiveClassesEnabled = true`;
const own = `student = @request.auth.id && (${relatedEnrolled})`;
const relatedRead = `${relatedScope} && (${relatedTeacher} || (${own}))`;

export const liveRules = {
  sessions: {
    listRule: `${auth} && ${enabled} && (${teacher} || ((${enrolled}) && (${member})))`,
    viewRule: `${auth} && ${enabled} && (${teacher} || ((${enrolled}) && (${member})))`,
    createRule: `${auth} && ${enabled} && ${teacher} && controller = @request.auth.id && status = "live" && lesson.course = course && lesson.status = "ready" && class = lesson.class && class != "" && ${dates}`,
    updateRule: `${auth} && ${enabled} && ${teacher} && controller = @request.auth.id && status = "live" && @request.body.expectedRevision = revision && @request.body.revision != revision && ${immutable(['course', 'class', 'lesson', 'controller', 'title', 'classTitle', 'code'])} && ${dates}`,
    deleteRule: null,
  },
  materials: {
    listRule: `${relatedScope} && ${relatedTeacher}`,
    viewRule: `${relatedScope} && ${relatedTeacher}`,
    createRule: `${relatedScope} && ${relatedTeacher} && session.controller = @request.auth.id && session.status = "live"`,
    updateRule: null, deleteRule: null,
  },
  participants: {
    listRule: relatedRead, viewRule: relatedRead,
    createRule: `${relatedScope} && ${own} && session.status = "live" && @request.body.joinCode = session.code && ${dates}`,
    updateRule: `${relatedScope} && ${own} && session.status = "live" && ${immutable(['session', 'student'])} && ${dates}`,
    deleteRule: null,
  },
  responses: {
    listRule: relatedRead, viewRule: relatedRead,
    createRule: `${relatedScope} && ${own} && session.status = "live" && session.activityOpen = true && screenId = session.screenId && screenRevision = session.revision && session.screenType != "content" && @collection.interactive_participants.session ?= session && @collection.interactive_participants.student ?= @request.auth.id && (session.screenType = "short-answer" || ${Array.from({ length: 8 }, (_, i) => `session.option${i} = answer`).join(' || ')}) && ${dates}`,
    updateRule: null, deleteRule: null,
  },
};

const timestampFields = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];
const text = (name, max, required = true) => ({ name, type: 'text', max, required });
const relation = (name, collectionId, required = true, cascadeDelete = true) => ({ name, type: 'relation', collectionId, required, maxSelect: 1, cascadeDelete });
async function ensure(pb, name, fields, rules, indexes = []) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (error) { if (error.status !== 404) throw error; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) {
    const i = merged.findIndex((item) => item.name === field.name);
    if (i < 0) merged.push(field); else merged[i] = { ...merged[i], ...field };
  }
  const payload = { fields: merged, ...rules, indexes: [...(current?.indexes || []), ...indexes.filter((index) => !current?.indexes?.some((item) => item.includes(index.match(/INDEX (\S+)/)[1])))] };
  return current ? pb.collections.update(current.id, payload) : pb.collections.create({ name, type: 'base', ...payload });
}

export async function applyLiveInteractiveSchema(pb) {
  const [courses, classes, lessons, users] = await Promise.all(['courses', 'classes', 'interactive_lessons', 'users'].map((name) => pb.collections.getOne(name)));
  // Create the collections locked first: their final rules reference one another.
  const session = await ensure(pb, 'interactive_sessions', [
    relation('course', courses.id), relation('class', classes.id, false, false), relation('lesson', lessons.id, false, false), relation('controller', users.id, false, false),
    text('title', 160), text('classTitle', 160), { ...text('code', 8), min: 8, pattern: '^[A-Z0-9]{8}$' },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['live', 'closed'] },
    { name: 'screenIndex', type: 'number', min: 0, max: 79, onlyInt: true }, text('screenId', 64),
    { name: 'screenType', type: 'select', required: true, maxSelect: 1, values: ['content', 'multiple-choice', 'poll', 'short-answer'] },
    { name: 'screen', type: 'json', required: true, maxSize: 200000 }, { name: 'activityOpen', type: 'bool' }, text('revision', 32),
    { name: 'closedAt', type: 'date' }, ...Array.from({ length: 8 }, (_, i) => text('option' + i, 64, false)), ...timestampFields(),
  ], {}, [
    'CREATE UNIQUE INDEX idx_live_code ON interactive_sessions (code)',
    "CREATE UNIQUE INDEX idx_live_lesson ON interactive_sessions (lesson) WHERE status = 'live' AND lesson != ''",
    'CREATE INDEX idx_live_course ON interactive_sessions (course, created)',
  ]);
  await ensure(pb, 'interactive_session_materials', [relation('session', session.id), { name: 'material', type: 'json', required: true, maxSize: 200000 }], liveRules.materials, [
    'CREATE UNIQUE INDEX idx_live_material ON interactive_session_materials (session)',
  ]);
  await ensure(pb, 'interactive_participants', [relation('session', session.id), relation('student', users.id), text('ping', 32), ...timestampFields()], liveRules.participants, [
    'CREATE UNIQUE INDEX idx_live_participant ON interactive_participants (session, student)',
  ]);
  await ensure(pb, 'interactive_responses', [relation('session', session.id), relation('student', users.id), text('screenId', 64), text('screenRevision', 32), text('answer', 2000), ...timestampFields()], liveRules.responses, [
    'CREATE UNIQUE INDEX idx_live_response ON interactive_responses (session, student, screenId)',
    'CREATE INDEX idx_live_activity ON interactive_responses (session, screenId)',
  ]);
  await pb.collections.update(session.id, liveRules.sessions);
  const settings = await pb.settings.getAll();
  if (!settings.batch?.enabled || settings.batch.maxRequests < 2) throw new Error('Se requiere batch habilitado con al menos dos operaciones. Ejecutá el script de configuración batch existente.');
}
