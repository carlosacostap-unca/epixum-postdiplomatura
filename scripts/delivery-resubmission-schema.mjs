export const DELIVERY_WORKFLOW_RULES = {
  listRule: '@request.auth.role = "admin" || student = @request.auth.id || assignment.course.teachers.id ?= @request.auth.id',
  viewRule: '@request.auth.role = "admin" || student = @request.auth.id || assignment.course.teachers.id ?= @request.auth.id',
  createRule: null,
  updateRule: null,
  deleteRule: null,
};

function mergeFields(current = [], expected = []) {
  const fields = [...current];
  for (const field of expected) {
    const index = fields.findIndex((candidate) => candidate.name === field.name);
    if (index === -1) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  return fields;
}

const WORKFLOW_FIELDS = [
  { name: 'status', type: 'select', required: false, maxSelect: 1, values: ['pending', 'draft', 'published'] },
  { name: 'submissionVersion', type: 'number', required: false, min: 1, onlyInt: true },
  { name: 'evaluatedVersion', type: 'number', required: false, min: 0, onlyInt: true },
  { name: 'submittedAt', type: 'date', required: false },
  { name: 'evaluatedAt', type: 'date', required: false },
  { name: 'resubmissionCount', type: 'number', required: false, min: 0, onlyInt: true },
  { name: 'history', type: 'json', required: false, maxSize: 1_000_000 },
];

function integer(value, minimum) {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum;
}

export function legacyDeliveryWorkflowPatch(delivery) {
  if (integer(delivery.submissionVersion, 1)) return null;
  const status = delivery.status === 'draft' || delivery.status === 'published' ? delivery.status : 'pending';
  const published = status === 'published';
  return {
    status,
    submissionVersion: 1,
    evaluatedVersion: published ? 1 : 0,
    submittedAt: delivery.created,
    evaluatedAt: published ? delivery.updated : '',
    resubmissionCount: 0,
    history: [],
  };
}

export async function applyDeliveryResubmissionSchema(pb) {
  let deliveries = await pb.collections.getOne('deliveries');
  deliveries = await pb.collections.update(deliveries.id, {
    fields: mergeFields(deliveries.fields, WORKFLOW_FIELDS),
    ...DELIVERY_WORKFLOW_RULES,
  });

  const records = await pb.collection('deliveries').getFullList({
    fields: 'id,created,updated,status,submissionVersion',
  });
  let migratedDeliveries = 0;
  for (const delivery of records) {
    const patch = legacyDeliveryWorkflowPatch(delivery);
    if (!patch) continue;
    await pb.collection('deliveries').update(delivery.id, patch);
    migratedDeliveries += 1;
  }

  return { deliveriesCollectionId: deliveries.id, migratedDeliveries };
}
