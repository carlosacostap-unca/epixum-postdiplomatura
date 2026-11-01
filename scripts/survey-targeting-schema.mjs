export const SURVEY_AUDIENCES = ['all', 'approved', 'not_approved_or_incomplete'];
export const surveyAudienceField = { name: 'audience', type: 'select', required: false, maxSelect: 1, values: SURVEY_AUDIENCES };

export async function applySurveyTargetingSchema(pb) {
  const current = await pb.collections.getOne('course_surveys');
  const existing = current.fields.find(field => field.name === 'audience');
  if (existing && existing.type !== 'select') throw new Error('El campo audience existente tiene un tipo incompatible.');
  const fields = [...current.fields];
  const index = fields.findIndex(field => field.name === 'audience');
  if (index < 0) fields.push(surveyAudienceField); else fields[index] = { ...fields[index], ...surveyAudienceField };
  await pb.collections.update(current.id, { fields });
}
