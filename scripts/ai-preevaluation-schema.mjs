import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export const ASSIGNMENT_AI_CONFIG_RULES = {
  listRule: '@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id)',
  viewRule: '@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id)',
  createRule: 'assignment.course.aiPreevaluationEnabled = true && (@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id))',
  updateRule: 'assignment.course.aiPreevaluationEnabled = true && (@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id))',
  deleteRule: 'assignment.course.aiPreevaluationEnabled = true && (@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id))',
};

export const AI_PREEVALUATION_RULES = {
  listRule: '@request.auth.role = "admin" || (@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id)',
  viewRule: '@request.auth.role = "admin" || (@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id)',
  createRule: null,
  updateRule: null,
  deleteRule: null,
};

function isNotFound(error) { return error?.status === 404; }
async function getCollection(pb, name) {
  try { return await pb.collections.getOne(name); }
  catch (error) { if (isNotFound(error)) return null; throw error; }
}
function mergeFields(current = [], expected = []) {
  const fields = [...current];
  for (const field of expected) {
    const index = fields.findIndex((candidate) => candidate.name === field.name);
    if (index === -1) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  return fields;
}
function mergeIndexes(current = [], expected = []) {
  const indexes = [...current];
  for (const index of expected) {
    const marker = index.match(/INDEX\s+(\S+)/i)?.[1];
    if (!marker || !indexes.some((candidate) => candidate.includes(marker))) indexes.push(index);
  }
  return indexes;
}

const AUDIT_FIELDS = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];

function configFields(assignmentsId) {
  return [
    { name: 'assignment', type: 'relation', required: true, collectionId: assignmentsId, cascadeDelete: true, maxSelect: 1 },
    { name: 'active', type: 'bool', required: false },
    { name: 'criteria', type: 'json', required: false, maxSize: 64_000 },
    { name: 'requiredChecks', type: 'json', required: false, maxSize: 32_000 },
    { name: 'allowedVerdicts', type: 'json', required: false, maxSize: 2_000 },
    { name: 'gradeEnabled', type: 'bool', required: false },
    { name: 'gradeMin', type: 'number', required: false },
    { name: 'gradeMax', type: 'number', required: false },
    { name: 'messageGuidance', type: 'text', required: false, max: 4_000 },
    { name: 'additionalInstructions', type: 'text', required: false, max: 12_000 },
    { name: 'version', type: 'number', required: false, min: 1, onlyInt: true },
    ...AUDIT_FIELDS,
  ];
}

function attemptFields(collections) {
  return [
    { name: 'course', type: 'relation', required: true, collectionId: collections.courses.id, cascadeDelete: true, maxSelect: 1 },
    { name: 'assignment', type: 'relation', required: true, collectionId: collections.assignments.id, cascadeDelete: true, maxSelect: 1 },
    { name: 'delivery', type: 'relation', required: true, collectionId: collections.deliveries.id, cascadeDelete: true, maxSelect: 1 },
    { name: 'requestedBy', type: 'relation', required: true, collectionId: collections.users.id, cascadeDelete: false, maxSelect: 1 },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['processing', 'completed', 'failed'] },
    { name: 'commitSha', type: 'text', required: true, min: 40, max: 40, pattern: '^[a-f0-9]{40}$' },
    { name: 'model', type: 'text', required: true, max: 80 },
    { name: 'configVersion', type: 'number', required: true, min: 1, onlyInt: true },
    { name: 'configSnapshot', type: 'json', required: true, maxSize: 128_000 },
    { name: 'coverage', type: 'json', required: false, maxSize: 256_000 },
    { name: 'result', type: 'json', required: false, maxSize: 256_000 },
    { name: 'usage', type: 'json', required: false, maxSize: 8_000 },
    { name: 'providerResponseId', type: 'text', required: false, max: 160 },
    { name: 'errorCategory', type: 'select', required: false, maxSelect: 1, values: ['configuration', 'authorization', 'github_not_found', 'github_private', 'github_rate_limit', 'github_timeout', 'github_unavailable', 'repository_limits', 'insufficient_evidence', 'openai_unavailable', 'openai_invalid_response', 'unknown'] },
    { name: 'errorMessage', type: 'text', required: false, max: 1_000 },
    { name: 'adoptedAt', type: 'date', required: false },
    { name: 'adoptedBy', type: 'relation', required: false, collectionId: collections.users.id, cascadeDelete: false, maxSelect: 1 },
    { name: 'adoptedAs', type: 'select', required: false, maxSelect: 1, values: ['draft', 'published'] },
    ...AUDIT_FIELDS,
  ];
}

async function ensureCollection(pb, name, fields, indexes, rules) {
  let collection = await getCollection(pb, name);
  if (!collection) {
    collection = await pb.collections.create({ name, type: 'base', fields, indexes: [], ...rules });
    if (indexes.length === 0) return collection;
    return pb.collections.update(collection.id, {
      indexes: mergeIndexes(collection.indexes, indexes),
    });
  }
  collection = await pb.collections.update(collection.id, {
    fields: mergeFields(collection.fields, fields),
    indexes: mergeIndexes(collection.indexes, indexes),
    ...rules,
  });
  return collection;
}

export async function applyAIPreevaluationSchema(pb) {
  let courses = await pb.collections.getOne('courses');
  const assignments = await pb.collections.getOne('assignments');
  const deliveries = await pb.collections.getOne('deliveries');
  const users = await pb.collections.getOne('users');
  courses = await pb.collections.update(courses.id, {
    fields: mergeFields(courses.fields, [{ name: 'aiPreevaluationEnabled', type: 'bool', required: false }]),
    updateRule: COURSE_UPDATE_RULE,
  });
  const configs = await ensureCollection(
    pb,
    'assignment_ai_configs',
    configFields(assignments.id),
    ['CREATE UNIQUE INDEX idx_assignment_ai_configs_assignment ON assignment_ai_configs (assignment)'],
    ASSIGNMENT_AI_CONFIG_RULES,
  );
  const attempts = await ensureCollection(
    pb,
    'ai_preevaluations',
    attemptFields({ courses, assignments, deliveries, users }),
    [
      'CREATE INDEX idx_ai_preevaluations_delivery_created ON ai_preevaluations (delivery, created)',
      "CREATE UNIQUE INDEX idx_ai_preevaluations_processing ON ai_preevaluations (delivery, commitSha, configVersion) WHERE status = 'processing'",
    ],
    AI_PREEVALUATION_RULES,
  );

  const existingConfigs = await pb.collection('assignment_ai_configs').getFullList({ fields: 'id,assignment' });
  const configuredAssignments = new Set(existingConfigs.map((record) => record.assignment));
  const legacyAssignments = await pb.collection('assignments').getFullList({ fields: 'id,systemPrompt' });
  let migratedPrompts = 0;
  for (const assignment of legacyAssignments) {
    const prompt = String(assignment.systemPrompt || '').trim();
    if (!prompt || configuredAssignments.has(assignment.id)) continue;
    await pb.collection('assignment_ai_configs').create({
      assignment: assignment.id,
      active: false,
      criteria: [{ id: 'legacy-general', title: 'Evaluación general', description: 'Aplicar las instrucciones adicionales migradas.' }],
      requiredChecks: [],
      allowedVerdicts: ['Aprobado', 'Corregir y reenviar'],
      gradeEnabled: true,
      gradeMin: 0,
      gradeMax: 10,
      messageGuidance: '',
      additionalInstructions: prompt,
      version: 1,
    });
    configuredAssignments.add(assignment.id);
    migratedPrompts += 1;
  }
  return { configsCollectionId: configs.id, attemptsCollectionId: attempts.id, migratedPrompts };
}
