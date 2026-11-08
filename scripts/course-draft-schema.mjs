// Additive guards preserve publication, ownership and module-specific permissions.
export function draftVisibility(prefix = '') {
  return `(@request.auth.id != "" && (${prefix}status != "borrador" || @request.auth.role = "admin" || ${prefix}teachers.id ?= @request.auth.id || ${prefix}guestStudents.id ?= @request.auth.id))`;
}

const INDIRECT = {
  links: ['class.course', 'assignment.course', 'content.course'],
  deliveries: ['assignment.course'], assignment_ai_configs: ['assignment.course'],
  inquiry_responses: ['inquiry.course'],
  interactive_session_materials: ['session.course'], interactive_participants: ['session.course'], interactive_responses: ['session.course'],
  review_blocks: ['review.course'], review_slots: ['review.course'], review_bookings: ['review.course'],
  review_booking_notes: ['booking.review.course'], review_block_meetings: ['block.review.course'],
  course_survey_participations: ['survey.course'], course_survey_responses: ['survey.course'],
  course_survey_revisions: ['survey.course'], course_survey_openings: ['survey.course'],
  course_outcome_history: ['outcome.course'],
};

export function draftSchemaPatches(collections) {
  const courses = collections.find(c => c.name === 'courses');
  if (!courses) throw new Error('No existe courses');
  const users = collections.find(c => c.name === 'users');
  if (!users) throw new Error('No existe users');
  return collections.flatMap(collection => {
    const direct = collection.fields.some(f => f.name === 'course' && f.collectionId === courses.id);
    const paths = collection.name === 'courses' ? [''] : direct ? ['course'] : INDIRECT[collection.name];
    if (!paths) return [];
    const guard = paths.map(path => path ? `(${path}.id != "" && ${draftVisibility(`${path}.`)})` : draftVisibility()).join(' || ');
    const data = {};
    for (const key of ['listRule','viewRule','createRule','updateRule','deleteRule']) {
      const rule = collection[key];
      if (typeof rule !== 'string' || rule.includes('guestStudents.id')) continue;
      // Creating a course is already restricted to administrators.
      if (collection.name === 'courses' && !['listRule','viewRule'].includes(key)) continue;
      data[key] = rule ? `(${rule}) && (${guard})` : `(${guard})`;
    }
    if (collection.name === 'courses') {
      if (!collection.fields.some(f => f.name === 'guestStudents')) data.fields = [...collection.fields, {
        name:'guestStudents', type:'relation', collectionId:users.id, maxSelect:999, cascadeDelete:false, required:false,
      }];
      if (!collection.updateRule?.includes('@request.body.guestStudents:isset')) {
        data.updateRule = `(${collection.updateRule}) && (@request.auth.role = "admin" || @request.body.guestStudents:isset = false)`;
      }
    }
    return Object.keys(data).length ? [{collection:collection.name,data}] : [];
  }).sort((a,b) => a.collection === 'courses' ? -1 : b.collection === 'courses' ? 1 : 0);
}

export async function applyCourseDraftSchema(pb) {
  const patches = draftSchemaPatches(await pb.collections.getFullList());
  for (const patch of patches) await pb.collections.update(patch.collection,patch.data);
  return patches.map(p => p.collection);
}
