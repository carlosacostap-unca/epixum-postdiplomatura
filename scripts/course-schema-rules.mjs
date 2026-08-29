export const COURSE_UPDATE_RULE =
  '@request.auth.role = "admin" || (@request.auth.role = "docente" && teachers.id ?= @request.auth.id && @request.body.organizationMode:isset = false && @request.body.enrollmentMode:isset = false && @request.body.contentsEnabled:isset = false && @request.body.aiPreevaluationEnabled:isset = false)';
