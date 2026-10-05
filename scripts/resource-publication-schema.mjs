import { LINK_RULES } from './course-content-schema.mjs';
import { ASSIGNMENT_RULES } from './weekly-schema.mjs';
import { publishedRule, withPublicationField } from './publication-fields.mjs';

export async function applyResourcePublicationSchema(pb) {
  // Referenced assignment field must exist before updating resource rules.
  for (const [name, rules] of [['assignments', ASSIGNMENT_RULES], ['links', LINK_RULES]]) {
    const collection = await pb.collections.getOne(name);
    const patch = { fields: withPublicationField(collection.fields), ...rules };
    if (Object.entries(patch).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(collection[key]))) {
      await pb.collections.update(collection.id, patch);
    }
  }
  const deliveries = await pb.collections.getOne('deliveries');
  const patch = {};
  // Preserve installations where delivery writes are restricted to the service.
  for (const key of ['createRule', 'updateRule']) {
    const rule = deliveries[key];
    if (rule !== null && !rule.includes('assignment.publicationStatus')) {
      const published = publishedRule('assignment.');
      patch[key] = key === 'createRule' ? `(${rule}) && ${published}`
        : `(${rule}) && (@request.auth.role = "admin" || assignment.course.teachers.id ?= @request.auth.id || ${published})`;
    }
  }
  if (Object.keys(patch).length) await pb.collections.update(deliveries.id, patch);
}
