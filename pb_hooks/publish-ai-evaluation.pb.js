/* global routerAdd, $apis */

// The server worker prepares the feedback outside the transaction. Recheck the
// opt-in and the exact submission while holding the PocketBase write transaction.
routerAdd('POST', '/api/epixum/publish-ai-evaluation', (event) => {
  const body = event.requestInfo().body;
  let published = false;
  event.app.runInTransaction((tx) => {
    const attempt = tx.findRecordById('ai_preevaluations', body.attemptId);
    const delivery = tx.findRecordById('deliveries', body.deliveryId);
    const assignment = tx.findRecordById('assignments', delivery.getString('assignment'));
    const course = tx.findRecordById('courses', assignment.getString('course'));
    const config = tx.findFirstRecordByFilter('assignment_ai_configs', 'assignment = {:id}', { id: assignment.id });
    const version = delivery.getInt('submissionVersion') || 1;
    if (!course.getBool('aiPreevaluationEnabled') || !config.getBool('active') || !config.getBool('autoPublish') ||
      !['', 'pending'].includes(delivery.getString('status')) || version !== body.version ||
      delivery.getString('repositoryUrl') !== body.repositoryUrl ||
      attempt.getString('delivery') !== delivery.id || attempt.getString('assignment') !== assignment.id ||
      attempt.getString('course') !== course.id || attempt.getInt('submissionVersion') !== version ||
      attempt.getInt('configVersion') !== config.getInt('version') || attempt.getString('adoptedAs') ||
      attempt.getString('status') !== 'completed') return;

    const result = JSON.parse(attempt.getString('result'));
    if (!body.feedback.trim() || result.verdict !== body.verdict || result.suggestedGrade !== body.grade) return;
    const now = new Date().toISOString();
    delivery.set('verdict', result.verdict);
    delivery.set('grade', result.suggestedGrade);
    delivery.set('feedback', body.feedback);
    delivery.set('status', 'published');
    delivery.set('evaluatedVersion', version);
    delivery.set('evaluatedAt', now);
    attempt.set('adoptedAt', now);
    attempt.set('adoptedBy', '');
    attempt.set('adoptedAs', 'published');
    tx.save(delivery);
    tx.save(attempt);
    published = true;
  });
  return event.json(200, { published });
}, $apis.requireSuperuserAuth());
