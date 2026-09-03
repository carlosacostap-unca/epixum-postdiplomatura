import assert from 'node:assert/strict';
import test from 'node:test';
import { COURSE_RULES, COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
import { WEEK_RULES, CONTENT_RULES, DELIVERY_RULES, INQUIRY_RULES, INQUIRY_RESPONSE_RULES } from './weekly-schema.mjs';
import { COURSE_CONTENT_RULES, LINK_RULES } from './course-content-schema.mjs';
import { ASSIGNMENT_AI_CONFIG_RULES, AI_PREEVALUATION_RULES } from './ai-preevaluation-schema.mjs';
import { INVITATION_RULES, ATTEMPT_RULES, ENROLLMENT_RULES } from './invitation-schema.mjs';

const contextualRuleSets = {
  courses: COURSE_RULES,
  weeks: WEEK_RULES,
  weeklyContent: CONTENT_RULES,
  inquiries: INQUIRY_RULES,
  inquiryResponses: INQUIRY_RESPONSE_RULES,
  deliveries: DELIVERY_RULES,
  courseContents: COURSE_CONTENT_RULES,
  links: LINK_RULES,
  assignmentAI: ASSIGNMENT_AI_CONFIG_RULES,
  aiAttempts: AI_PREEVALUATION_RULES,
  invitations: INVITATION_RULES,
  attempts: ATTEMPT_RULES,
  enrollments: ENROLLMENT_RULES,
};

test('las reglas contextuales no autorizan por roles globales heredados', () => {
  for (const [collection, rules] of Object.entries(contextualRuleSets)) {
    for (const [operation, rule] of Object.entries(rules)) {
      if (typeof rule !== 'string') continue;
      assert.doesNotMatch(rule, /@request\.auth\.role = "(?:docente|estudiante)"/, `${collection}.${operation}`);
    }
  }
});

test('la matrícula directa permanece bloqueada y las relaciones gobiernan el alcance', () => {
  assert.equal(ENROLLMENT_RULES.createRule, null);
  assert.match(COURSE_UPDATE_RULE, /teachers\.id \?= @request\.auth\.id/);
  assert.match(COURSE_UPDATE_RULE, /@request\.body\.teachers:isset = false/);
  assert.match(WEEK_RULES.viewRule, /course_enrollments_via_course\.student\.id/);
  assert.match(COURSE_CONTENT_RULES.viewRule, /course_enrollments_via_course\.student\.id/);
  assert.match(ASSIGNMENT_AI_CONFIG_RULES.viewRule, /teachers\.id \?= @request\.auth\.id/);
});
