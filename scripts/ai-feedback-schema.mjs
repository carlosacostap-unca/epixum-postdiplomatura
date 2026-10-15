export const STUDENT_FEEDBACK_MODE_FIELD = {
  name: 'studentFeedbackMode', type: 'select', required: false, maxSelect: 1,
  values: ['full_report', 'message_only'],
};

export function studentFeedbackSchemaPatch(collection) {
  const fields = collection.fields.map(field => ({ ...field }));
  const index = fields.findIndex(field => field.name === STUDENT_FEEDBACK_MODE_FIELD.name);
  if (index < 0) fields.push(STUDENT_FEEDBACK_MODE_FIELD);
  else fields[index] = { ...fields[index], ...STUDENT_FEEDBACK_MODE_FIELD };
  return { fields };
}

export async function applyStudentFeedbackSchema(pb) {
  const collection = await pb.collections.getOne('assignment_ai_configs');
  return pb.collections.update(collection.id, studentFeedbackSchemaPatch(collection));
}
