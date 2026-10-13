export const DOCUMENT_ATTEMPT_FIELDS = [
  { name: 'sourceType', type: 'select', required: false, maxSelect: 1, values: ['github', 'documents'] },
  { name: 'sourceDigest', type: 'text', required: false, min: 0, max: 64, pattern: '^[a-f0-9]{64}$' },
  { name: 'submissionReferenceHash', type: 'text', required: false, min: 0, max: 64, pattern: '^[a-f0-9]{64}$' },
  { name: 'submissionVersion', type: 'number', required: false, min: 0, onlyInt: true },
];

export function documentPreevaluationSchemaPatch(collection) {
  const fields = collection.fields.map(field => field.name === 'commitSha'
    ? { ...field, required: false, min: 0, max: 40, pattern: '^[a-f0-9]{40}$' } : { ...field });
  for (const field of DOCUMENT_ATTEMPT_FIELDS) {
    const index = fields.findIndex(candidate => candidate.name === field.name);
    if (index < 0) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  // Preserve the original processing constraint: one active analysis per delivery/rubric.
  // Documents use an empty commitSha; the service deduplicates by digest and version.
  return { fields };
}

export async function applyDocumentPreevaluationSchema(pb) {
  const collection = await pb.collections.getOne('ai_preevaluations');
  return pb.collections.update(collection.id, documentPreevaluationSchemaPatch(collection));
}
