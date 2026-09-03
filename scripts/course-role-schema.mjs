import { COURSE_RULES } from './course-schema-rules.mjs';
import { WEEK_RULES, CONTENT_RULES, DELIVERY_RULES, INQUIRY_RULES, INQUIRY_RESPONSE_RULES } from './weekly-schema.mjs';
import { COURSE_CONTENT_RULES, LINK_RULES } from './course-content-schema.mjs';
import { ASSIGNMENT_AI_CONFIG_RULES, AI_PREEVALUATION_RULES } from './ai-preevaluation-schema.mjs';
import { INVITATION_RULES, ATTEMPT_RULES, ENROLLMENT_RULES } from './invitation-schema.mjs';

export const COURSE_ROLE_RULES = {
  courses: COURSE_RULES,
  course_enrollments: ENROLLMENT_RULES,
  course_enrollment_invitations: INVITATION_RULES,
  course_enrollment_attempts: ATTEMPT_RULES,
  course_weeks: WEEK_RULES,
  classes: CONTENT_RULES,
  assignments: CONTENT_RULES,
  inquiries: INQUIRY_RULES,
  inquiry_responses: INQUIRY_RESPONSE_RULES,
  deliveries: DELIVERY_RULES,
  course_contents: COURSE_CONTENT_RULES,
  links: LINK_RULES,
  assignment_ai_configs: ASSIGNMENT_AI_CONFIG_RULES,
  ai_preevaluations: AI_PREEVALUATION_RULES,
};

export async function applyCourseRoleRules(pb) {
  const updatedCollections = [];
  for (const [name, rules] of Object.entries(COURSE_ROLE_RULES)) {
    let collection;
    try {
      collection = await pb.collections.getOne(name);
    } catch (error) {
      if (error?.status === 404) continue;
      throw error;
    }
    await pb.collections.update(collection.id, rules);
    updatedCollections.push(name);
  }
  return { updatedCollections };
}
