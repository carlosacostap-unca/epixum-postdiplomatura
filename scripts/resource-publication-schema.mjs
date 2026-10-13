import { LINK_RULES, COURSE_CONTENT_RULES } from './course-content-schema.mjs';
import { ASSIGNMENT_RULES, CLASS_RULES } from './weekly-schema.mjs';
import { visiblePublicationRule, withResourcePublicationFields, withScheduledPublicationFields } from './publication-fields.mjs';

export async function applyResourcePublicationSchema(pb) {
  // All parent fields must exist before installing resource rules.
  for (const name of ['classes', 'assignments', 'course_contents']) {
    const collection = await pb.collections.getOne(name);
    const fields = withScheduledPublicationFields(collection.fields);
    if (JSON.stringify(fields) !== JSON.stringify(collection.fields)) await pb.collections.update(collection.id, { fields });
  }
  for (const [name, rules] of [['classes', CLASS_RULES], ['assignments', ASSIGNMENT_RULES], ['course_contents', COURSE_CONTENT_RULES], ['links', LINK_RULES]]) {
    const collection = await pb.collections.getOne(name);
    const patch = { ...(name === 'links' ? { fields: withResourcePublicationFields(collection.fields) } : {}), ...rules };
    if (Object.entries(patch).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(collection[key]))) {
      await pb.collections.update(collection.id, patch);
    }
  }
  const deliveries = await pb.collections.getOne('deliveries');
  const patch = {};
  // Preserve installations where delivery writes are restricted to the service.
  for (const key of ['createRule', 'updateRule']) {
    const rule = deliveries[key];
    if (rule !== null && !rule.includes('assignment.publishAt')) {
      const legacy = '(assignment.publicationStatus = "" || assignment.publicationStatus = "published")';
      const published = visiblePublicationRule('assignment.');
      if (rule.includes(legacy)) {
        patch[key] = rule.replaceAll(legacy, published);
        continue;
      }
      patch[key] = key === 'createRule' ? `(${rule}) && ${published}`
        : `(${rule}) && (@request.auth.role = "admin" || assignment.course.teachers.id ?= @request.auth.id || ${published})`;
    }
  }
  if (Object.keys(patch).length) await pb.collections.update(deliveries.id, patch);
}
