export const LATE_SUBMISSION_FIELDS = {
  assignments: { name: 'allowLateSubmissions', type: 'bool', required: false },
  deliveries: { name: 'deadlineSnapshot', type: 'json', required: false, maxSize: 2_000 },
};

export async function applyLateSubmissionSchema(pb) {
  // Validate both collections before any write. Never overwrite an incompatible field.
  const plans = await Promise.all(Object.entries(LATE_SUBMISSION_FIELDS).map(async ([name, field]) => {
    const collection = await pb.collections.getOne(name);
    if (name === 'deliveries' && (collection.createRule !== null || collection.updateRule !== null)) {
      throw new Error('Las escrituras de deliveries deben estar restringidas al servidor. Aplicá primero schema:delivery-resubmissions.');
    }
    const current = collection.fields.find(f => f.name === field.name);
    if (current && (current.type !== field.type || current.required)) throw new Error(`Campo incompatible: ${name}.${field.name}`);
    if (current?.type === 'json' && current.maxSize < field.maxSize) throw new Error(`Capacidad insuficiente: ${name}.${field.name}`);
    return { collection, field, missing: !current };
  }));
  const added = [];
  for (const { collection, field, missing } of plans) {
    if (!missing) continue;
    await pb.collections.update(collection.id, { fields: [...collection.fields, field] });
    added.push(`${collection.name}.${field.name}`);
  }
  return { added };
}
