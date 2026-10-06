import { z } from 'zod';
import type { InteractiveMaterial, InteractiveScreen } from './interactive-material';

type PublicFields<T> = T extends InteractiveScreen ? Omit<T, 'teacherNotes' | 'correctOptionId' | 'explanation'> : never;
export type PublicScreen = PublicFields<InteractiveScreen>;
export interface LiveSession {
  id: string; course: string; class: string; lesson: string; controller: string;
  title: string; classTitle: string; code: string; status: 'live' | 'closed';
  screenIndex: number; screenId: string; screenType: InteractiveScreen['type']; screen: PublicScreen;
  activityOpen: boolean; revision: string; created: string; updated: string; closedAt: string;
  attendanceEnabled?: boolean;
}
export interface LiveParticipant { id: string; student: string; name: string; updated: string }
export interface LiveAnswer { id: string; student: string; screenId: string; answer: string; created: string }
export interface LiveProjectionResults { screenId: string; total: number; counts: Record<string, number> }
export function projectionResults(screen: PublicScreen, answers: Pick<LiveAnswer, 'screenId' | 'answer'>[]): LiveProjectionResults {
  const counts: Record<string, number> = Object.fromEntries('options' in screen ? screen.options.map((option) => [option.id, 0]) : []);
  let total = 0;
  for (const answer of answers) {
    if (answer.screenId === screen.id && Object.hasOwn(counts, answer.answer)) {
      counts[answer.answer] += 1;
      total += 1;
    }
  }
  return { screenId: screen.id, total, counts };
}
export type LiveState = {
  session: LiveSession; serverTime: number; ownAnswer: LiveAnswer | null;
} & ({ role: 'student' } | {
  role: 'teacher'; canControl: boolean; material: InteractiveMaterial;
  participants: LiveParticipant[]; answers: LiveAnswer[]; resultsScreenId: string;
  projectionResults: LiveProjectionResults;
});
const id = z.string().regex(/^[a-z0-9]{15}$/);
const revision = z.string().regex(/^[a-f0-9]{24}$/);
export const startSessionSchema = z.object({ courseId: id, lessonId: id }).strict();
export const joinSessionSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, 'Ingresá el código de ocho caracteres.') }).strict();
export const liveCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('screen'), revision, index: z.number().int().min(0).max(79) }).strict(),
  z.object({ kind: z.literal('activity'), revision, open: z.boolean() }).strict(),
  z.object({ kind: z.literal('finish'), revision }).strict(),
  z.object({ kind: z.literal('answer'), revision, screenId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), answer: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal('heartbeat') }).strict(),
]);
export type LiveCommand = z.infer<typeof liveCommandSchema>;

// Explicit allowlist: solutions and future fields must never reach participants.
export function publicScreen(screen: InteractiveScreen): PublicScreen {
  const base = { id: screen.id, title: screen.title, body: screen.body };
  if (screen.type === 'content') return { ...base, type: screen.type };
  if (screen.type === 'short-answer') return { ...base, type: screen.type, maxLength: screen.maxLength };
  return { ...base, type: screen.type, options: screen.options.map(({ id, label }) => ({ id, label })) };
}

export function validateLiveAnswer(screen: PublicScreen, value: string) {
  const answer = value.trim();
  if (!answer || screen.type === 'content') throw new Error('Completá una respuesta válida.');
  if (screen.type === 'short-answer') {
    if (answer.length > screen.maxLength) throw new Error(`La respuesta admite hasta ${screen.maxLength} caracteres.`);
  } else if (!screen.options.some((option) => option.id === answer)) throw new Error('Elegí una de las opciones disponibles.');
  return answer;
}

export function safeInteractiveReturn(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200 || /[\\\r\n]/.test(value)) return null;
  if (/^\/interactivas(?:\?codigo=[A-Za-z0-9]{8})?$/.test(value)) return value;
  if (/^\/interactivas\/sesion\/[a-z0-9]{15}$/.test(value)) return value;
  return null;
}
