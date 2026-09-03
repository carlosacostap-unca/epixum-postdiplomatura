export const COURSE_UPDATE_RULE =
  '@request.auth.role = "admin" || (teachers.id ?= @request.auth.id && @request.body.teachers:isset = false && @request.body.organizationMode:isset = false && @request.body.enrollmentMode:isset = false && @request.body.contentsEnabled:isset = false && @request.body.aiPreevaluationEnabled:isset = false)';

export const COURSE_RULES = {
  listRule: '@request.auth.id != ""',
  viewRule: '@request.auth.id != ""',
  createRule: '@request.auth.role = "admin"',
  updateRule: COURSE_UPDATE_RULE,
  deleteRule: '@request.auth.role = "admin"',
};
