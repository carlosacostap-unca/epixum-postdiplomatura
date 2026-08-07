import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const superEmail = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const superPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
const hmacSecret = process.env.COURSE_ENROLLMENT_SECRET;
if (!url || !superEmail || !superPassword || !hmacSecret || hmacSecret.length < 32) {
  throw new Error('Faltan credenciales de PocketBase o COURSE_ENROLLMENT_SECRET válido en .env.local');
}

const runId = randomUUID().slice(0, 8);
const prefix = `openspec-invitation-${runId}`;
const userPassword = `Epixum-${randomUUID()}!`;
const sharedPassword = `Compartida-${randomUUID()}`;
const rotatedPassword = `Rotada-${randomUUID()}`;
const traditionalKey = `KEY-${randomUUID()}`.toUpperCase();
const created = [];
const cleanupFailures = [];
const assertions = [];
const superPb = new PocketBase(url);
superPb.autoCancellation(false);

function client() {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  return pb;
}

function proof(value) {
  return createHmac('sha256', hmacSecret).update(value, 'utf8').digest('hex');
}

function track(collection, record) {
  created.push({ collection, id: record.id });
  return record;
}

async function fixture(collection, data, pb = superPb) {
  return track(collection, await pb.collection(collection).create(data));
}

async function expectDenied(operation, label) {
  try {
    await operation();
    assert.fail(`${label}: la operación debió ser rechazada`);
  } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    assert.ok([400, 403, 404].includes(error?.status), `${label}: estado inesperado ${error?.status}`);
    assertions.push(label);
  }
}

async function createUser(role, marker) {
  const email = `${prefix}-${marker}@example.invalid`;
  const user = await fixture('users', {
    email,
    emailVisibility: false,
    verified: true,
    password: userPassword,
    passwordConfirm: userPassword,
    role,
    name: `OpenSpec ${marker}`,
    firstName: 'OpenSpec',
    lastName: marker,
  });
  const pb = client();
  await pb.collection('users').authWithPassword(email, userPassword);
  return { email, pb, user };
}

async function cleanup() {
  for (const item of [...created].reverse()) {
    try {
      await superPb.collection(item.collection).delete(item.id);
    } catch (error) {
      if (error?.status !== 404) cleanupFailures.push({ ...item, status: error?.status || 'unknown' });
    }
  }
  for (const item of created) {
    try {
      await superPb.collection(item.collection).getOne(item.id, { fields: 'id' });
      cleanupFailures.push({ ...item, status: 'still-present' });
    } catch (error) {
      if (error?.status !== 404) cleanupFailures.push({ ...item, status: `verify-${error?.status || 'unknown'}` });
    }
  }
}

try {
  await superPb.collection('_superusers').authWithPassword(superEmail, superPassword);
  const admin = await createUser('admin', 'admin');
  const teacher = await createUser('docente', 'teacher');
  const outsider = await createUser('docente', 'outsider');
  const invited = await createUser('estudiante', 'invited');
  const uninvited = await createUser('estudiante', 'uninvited');

  const restrictedCourse = await fixture('courses', {
    title: `${prefix} restringido`,
    description: 'Fixture temporal de doble validación.',
    status: 'en curso',
    organizationMode: 'tradicional',
    enrollmentMode: 'invitacion_contrasena',
    teachers: [teacher.user.id],
  }, admin.pb);
  await superPb.collection('courses').update(restrictedCourse.id, {
    invitationPasswordHash: proof(sharedPassword),
  });
  const traditionalCourse = await fixture('courses', {
    title: `${prefix} tradicional`,
    description: 'Fixture temporal de matrícula tradicional.',
    status: 'en curso',
    organizationMode: 'tradicional',
    enrollmentMode: 'clave',
    teachers: [teacher.user.id],
  }, admin.pb);
  await superPb.collection('courses').update(traditionalCourse.id, {
    enrollmentKeyHash: proof(traditionalKey.trim().toUpperCase()),
  });

  const invitation = await fixture('course_enrollment_invitations', {
    course: restrictedCourse.id,
    emailNormalized: invited.email.trim().toLowerCase(),
    status: 'pendiente',
  }, admin.pb);

  const adminInvitations = await admin.pb.collection('course_enrollment_invitations').getFullList({
    filter: admin.pb.filter('course = {:course}', { course: restrictedCourse.id }),
  });
  assert.equal(adminInvitations.length, 1);
  assertions.push('el administrador gestiona invitaciones');

  for (const actor of [teacher, outsider]) {
    const visible = await actor.pb.collection('course_enrollment_invitations').getFullList({
      filter: actor.pb.filter('course = {:course}', { course: restrictedCourse.id }),
    });
    assert.equal(visible.length, 0);
  }
  assertions.push('docente asignado y ajeno no leen emails invitados');
  await expectDenied(
    () => teacher.pb.collection('course_enrollment_invitations').create({ course: restrictedCourse.id, emailNormalized: 'no@example.invalid', status: 'pendiente' }),
    'un docente no crea invitaciones',
  );

  let ownInvitations = await invited.pb.collection('course_enrollment_invitations').getFullList({ expand: 'course' });
  assert.deepEqual(ownInvitations.map((item) => item.id), [invitation.id]);
  const unrelatedInvitations = await uninvited.pb.collection('course_enrollment_invitations').getFullList();
  assert.equal(unrelatedInvitations.length, 0);
  assertions.push('sólo el estudiante invitado ve su invitación');

  await admin.pb.collection('courses').update(restrictedCourse.id, { enrollmentMode: 'clave' });
  ownInvitations = await invited.pb.collection('course_enrollment_invitations').getFullList();
  assert.equal(ownInvitations.length, 0);
  await admin.pb.collection('courses').update(restrictedCourse.id, { enrollmentMode: 'invitacion_contrasena' });
  ownInvitations = await invited.pb.collection('course_enrollment_invitations').getFullList();
  assert.deepEqual(ownInvitations.map((item) => item.id), [invitation.id]);
  assertions.push('la modalidad oculta y restaura invitaciones pendientes');

  await teacher.pb.collection('courses').update(restrictedCourse.id, { invitationPasswordHash: proof(rotatedPassword) });
  const unchangedCredential = await superPb.collection('courses').getOne(restrictedCourse.id, {
    fields: 'id,invitationPasswordHash',
  });
  assert.equal(unchangedCredential.invitationPasswordHash, proof(sharedPassword));
  assertions.push('PocketBase descarta escrituras regulares sobre hashes ocultos');
  await expectDenied(
    () => outsider.pb.collection('courses').update(restrictedCourse.id, { invitationPasswordHash: proof('Ajena-123') }),
    'un docente ajeno no rota la contraseña',
  );
  await expectDenied(
    () => teacher.pb.collection('courses').update(restrictedCourse.id, { enrollmentMode: 'clave' }),
    'un docente asignado no cambia la modalidad',
  );
  await superPb.collection('courses').update(restrictedCourse.id, {
    invitationPasswordHash: proof(rotatedPassword),
  });
  const rotatedCredential = await superPb.collection('courses').getOne(restrictedCourse.id, {
    fields: 'id,invitationPasswordHash',
  });
  assert.equal(rotatedCredential.invitationPasswordHash, proof(rotatedPassword));
  assertions.push('el cliente de servicio rota la contraseña tras validar alcance docente');

  const attempt = await fixture('course_enrollment_attempts', {
    course: restrictedCourse.id,
    invitation: invitation.id,
    student: invited.user.id,
  }, invited.pb);
  assert.ok(!Object.keys(attempt).some((key) => /password|hash|secret/i.test(key)));
  await expectDenied(
    () => invited.pb.collection('course_enrollment_attempts').update(attempt.id, { student: invited.user.id }),
    'el estudiante no modifica intentos',
  );
  await expectDenied(
    () => invited.pb.collection('course_enrollment_attempts').delete(attempt.id),
    'el estudiante no elimina intentos',
  );
  await expectDenied(
    () => uninvited.pb.collection('course_enrollment_attempts').create({ course: restrictedCourse.id, invitation: invitation.id, student: uninvited.user.id }),
    'un estudiante no usa una invitación ajena para registrar intentos',
  );
  await expectDenied(
    () => invited.pb.collection('course_enrollment_invitations').update(invitation.id, { emailNormalized: uninvited.email }),
    'el estudiante no cambia el email invitado',
  );

  await expectDenied(
    () => invited.pb.collection('course_enrollments').create({ course: restrictedCourse.id, student: invited.user.id, invitation: invitation.id, keyHash: proof(sharedPassword) }),
    'una llamada directa no crea matrículas con la contraseña anterior',
  );
  await expectDenied(
    () => invited.pb.collection('course_enrollments').create({ course: restrictedCourse.id, student: invited.user.id, invitation: invitation.id, keyHash: proof(rotatedPassword) }),
    'una llamada directa tampoco crea matrículas con la contraseña vigente',
  );
  await expectDenied(
    () => uninvited.pb.collection('course_enrollments').create({ course: restrictedCourse.id, student: uninvited.user.id, invitation: invitation.id, keyHash: proof(rotatedPassword) }),
    'un estudiante no se matricula con una invitación ajena',
  );
  await expectDenied(
    () => invited.pb.collection('course_enrollment_invitations').update(invitation.id, {
      status: 'activada',
      activatedStudent: invited.user.id,
    }),
    'el estudiante no activa directamente una invitación',
  );
  await expectDenied(
    () => superPb.collection('courses').getFirstListItem(
      superPb.filter('id = {:courseId} && invitationPasswordHash = {:hash}', {
        courseId: restrictedCourse.id,
        hash: proof(sharedPassword),
      }),
    ),
    'la contraseña anterior deja de validar inmediatamente',
  );
  const validatedRestrictedCourse = await superPb.collection('courses').getFirstListItem(
    superPb.filter('id = {:courseId} && invitationPasswordHash = {:hash}', {
      courseId: restrictedCourse.id,
      hash: proof(rotatedPassword),
    }),
    { fields: 'id' },
  );
  assert.equal(validatedRestrictedCourse.id, restrictedCourse.id);
  assertions.push('la Server Action puede validar la contraseña vigente sin exponer el hash');

  const restrictedEnrollment = await fixture('course_enrollments', {
    course: restrictedCourse.id,
    student: invited.user.id,
    invitation: invitation.id,
    keyHash: proof(rotatedPassword),
  });
  assert.equal(restrictedEnrollment.course, restrictedCourse.id);
  const visibleRestrictedEnrollment = await invited.pb.collection('course_enrollments').getOne(restrictedEnrollment.id);
  assert.ok(!('keyHash' in visibleRestrictedEnrollment));
  await superPb.collection('course_enrollment_invitations').update(invitation.id, {
    status: 'activada',
    activatedStudent: invited.user.id,
    activatedAt: new Date().toISOString(),
  });
  assertions.push('la activación real crea matrícula y traza la invitación');

  const restrictedClass = await fixture('classes', {
    course: restrictedCourse.id,
    title: `${prefix} clase restringida`,
    description: '',
  }, teacher.pb);
  await invited.pb.collection('classes').getOne(restrictedClass.id);
  assertions.push('la matrícula activada concede acceso al contenido');

  await expectDenied(
    () => uninvited.pb.collection('course_enrollments').create({
      course: traditionalCourse.id,
      student: uninvited.user.id,
      keyHash: proof(traditionalKey.trim().toUpperCase()),
    }),
    'una llamada directa no crea matrículas tradicionales',
  );
  const validatedTraditionalCourse = await superPb.collection('courses').getFirstListItem(
    superPb.filter('id = {:courseId} && enrollmentKeyHash = {:hash}', {
      courseId: traditionalCourse.id,
      hash: proof(traditionalKey.trim().toUpperCase()),
    }),
    { fields: 'id' },
  );
  assert.equal(validatedTraditionalCourse.id, traditionalCourse.id);
  const traditionalEnrollment = await fixture('course_enrollments', {
    course: traditionalCourse.id,
    student: uninvited.user.id,
    keyHash: proof(traditionalKey.trim().toUpperCase()),
  });
  assert.equal(traditionalEnrollment.course, traditionalCourse.id);
  const traditionalClass = await fixture('classes', {
    course: traditionalCourse.id,
    title: `${prefix} clase tradicional`,
    description: '',
  }, teacher.pb);
  await uninvited.pb.collection('classes').getOne(traditionalClass.id);
  assertions.push('la matrícula por clave tradicional continúa operativa');

  await admin.pb.collection('courses').update(restrictedCourse.id, { enrollmentMode: 'clave' });
  await invited.pb.collection('course_enrollments').getOne(restrictedEnrollment.id);
  await invited.pb.collection('classes').getOne(restrictedClass.id);
  assertions.push('cambiar modalidad conserva matrícula y acceso existentes');
} catch (error) {
  const detail = error?.response?.message || error?.message || String(error);
  process.stderr.write(`Verificación de invitaciones fallida (${error?.status || 'sin estado'}): ${detail}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
  if (cleanupFailures.length > 0) {
    process.stderr.write(`Limpieza incompleta: ${JSON.stringify(cleanupFailures)}\n`);
    process.exitCode = 1;
  }
  process.stdout.write(`${JSON.stringify({ runId, assertions: assertions.length, cleanup: cleanupFailures.length === 0 ? 'completa' : 'incompleta' }, null, 2)}\n`);
}
