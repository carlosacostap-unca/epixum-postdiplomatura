import 'server-only';
import type PocketBase from 'pocketbase';
import { authorizeCourseGame } from './service';
import { characterSchema, completedTourSteps, enrollmentCharacterSchema, initialGameProfile, TOUR_STEPS, TOUR_VERSION, type Character, type GameProgress, type GameWelcomeState } from './onboarding';

interface RecordProgress { id: string; character: Character; contactEmail: string; profileConfirmedAt: string }
async function access(pb: PocketBase, courseId: string) {
  const context = await authorizeCourseGame(pb, courseId);
  if (!context) throw new Error('No tenés acceso a esta aula.');
  return context;
}
async function readRecord(service: PocketBase, course: string, student: string) {
  const result = await service.collection('course_game_onboarding').getList<RecordProgress>(1, 1, {
    filter: service.filter('course = {:course} && student = {:student}', { course, student }),
    fields: 'id,character,contactEmail,profileConfirmedAt',
  });
  return result.items[0] ?? null;
}
async function progressFor(service: PocketBase, row: RecordProgress): Promise<GameProgress> {
  const character = characterSchema.parse(row.character);
  const steps = await service.collection('course_game_tour_steps').getFullList<{ step: number }>({
    filter: service.filter('onboarding = {:id} && version = {:version}', { id: row.id, version: TOUR_VERSION }), fields: 'step',
  });
  const tourStep = completedTourSteps(steps.map(item => item.step));
  return { character, tourStep, completed: tourStep === TOUR_STEPS.length };
}

export async function readGameWelcome(pb: PocketBase, service: PocketBase, courseId: string): Promise<GameWelcomeState> {
  const { user } = await access(pb, courseId);
  const row = await readRecord(service, courseId, user.id);
  const profile = initialGameProfile(user);
  if (!row) return { profile, character: null, tourStep: 0, completed: false };
  if (!row.profileConfirmedAt) throw new Error('No pudimos recuperar tu bienvenida.');
  return { ...await progressFor(service, row), profile: { ...profile, contactEmail: row.contactEmail, confirmed: true } };
}

export async function saveGameIdentity(pb: PocketBase, service: PocketBase, courseId: string, input: unknown): Promise<GameProgress> {
  const { user } = await access(pb, courseId);
  const { character, profile } = enrollmentCharacterSchema.parse(input);
  const existing = await readRecord(service, courseId, user.id);
  if (existing?.profileConfirmedAt) return progressFor(service, existing);
  const { contactEmail, confirmed: _confirmed, ...personal } = profile;
  void _confirmed;
  const batch = service.createBatch();
  batch.collection('users').update(user.id, { ...personal, name: `${personal.firstName} ${personal.lastName}`, birthDate: `${personal.birthDate}T12:00:00.000Z` });
  const data = { course: courseId, student: user.id, character, contactEmail, profileConfirmedAt: new Date().toISOString() };
  if (existing) batch.collection('course_game_onboarding').update(existing.id, data);
  else batch.collection('course_game_onboarding').create(data);
  try { await batch.send(); }
  catch (error) {
    // The unique index settles concurrent first submissions; batch rolls back profile writes.
    const concurrent = await readRecord(service, courseId, user.id);
    if (!concurrent?.profileConfirmedAt) throw error;
    return progressFor(service, concurrent);
  }
  return { character, tourStep: 0, completed: false };
}

export async function updateGameIdentity(pb: PocketBase, service: PocketBase, courseId: string, input: unknown): Promise<GameProgress> {
  const { user } = await access(pb, courseId);
  const { character, profile } = enrollmentCharacterSchema.parse(input);
  const row = await readRecord(service, courseId, user.id);
  if (!row?.profileConfirmedAt) throw new Error('Primero completá tu bienvenida.');
  const current = await progressFor(service, row);
  const { contactEmail, confirmed, ...personal } = profile;
  void confirmed;
  const batch = service.createBatch();
  batch.collection('users').update(user.id, { ...personal, name: `${personal.firstName} ${personal.lastName}`, birthDate: `${personal.birthDate}T12:00:00.000Z` });
  batch.collection('course_game_onboarding').update(row.id, { character, contactEmail, profileConfirmedAt: new Date().toISOString() });
  await batch.send();
  return { ...current, character };
}

export async function advanceGameTour(pb: PocketBase, service: PocketBase, courseId: string, expectedStep: number): Promise<GameProgress> {
  const { user } = await access(pb, courseId);
  if (!Number.isInteger(expectedStep) || expectedStep < 0 || expectedStep >= TOUR_STEPS.length) throw new Error('Paso de recorrido inválido.');
  const row = await readRecord(service, courseId, user.id);
  if (!row?.profileConfirmedAt) throw new Error('Primero creá tu personaje y confirmá tus datos.');
  const current = await progressFor(service, row);
  if (expectedStep < current.tourStep) return current;
  if (expectedStep !== current.tourStep) throw new Error('Completá el recorrido en orden.');
  try { await service.collection('course_game_tour_steps').create({ onboarding: row.id, version: TOUR_VERSION, step: expectedStep + 1 }); }
  catch (error) {
    const concurrent = await progressFor(service, row);
    if (concurrent.tourStep <= expectedStep) throw error;
    return concurrent;
  }
  return { ...current, tourStep: expectedStep + 1, completed: expectedStep + 1 === TOUR_STEPS.length };
}
