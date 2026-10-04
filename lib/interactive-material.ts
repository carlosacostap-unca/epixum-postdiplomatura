import { z } from 'zod';

export const MAX_MATERIAL_BYTES = 200_000;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, 'Usá identificadores de hasta 64 letras, números, guiones o guiones bajos.');
const title = z.string().trim().min(1, 'Completá el título.').max(160, 'El título admite hasta 160 caracteres.');
const body = z.string().max(12_000, 'El contenido de una pantalla admite hasta 12000 caracteres.');
const teacherNotes = z.string().max(12_000, 'El guion de una pantalla admite hasta 12000 caracteres.');
const base = { id: identifier, title, body: body.optional().default(''), teacherNotes: teacherNotes.optional() };
const options = z.array(z.object({ id: identifier, label: z.string().trim().min(1).max(300) }).strict())
  .min(2, 'Agregá al menos dos opciones.').max(8, 'Se admiten hasta ocho opciones.')
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, 'Hay identificadores de opciones repetidos.');

const screenSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('content'), body: body.trim().min(1, 'Completá el contenido de la pantalla.') }).strict(),
  z.object({ ...base, type: z.literal('multiple-choice'), options, correctOptionId: identifier, explanation: z.string().max(2000).optional().default('') }).strict(),
  z.object({ ...base, type: z.literal('poll'), options }).strict(),
  z.object({ ...base, type: z.literal('short-answer'), maxLength: z.number().int().min(1).max(2000).optional().default(500) }).strict(),
]);

export const interactiveMaterialSchema = z.object({
  version: z.literal(1),
  screens: z.array(screenSchema).min(1, 'El material debe tener al menos una pantalla.').max(80, 'Se admiten hasta 80 pantallas.'),
}).strict().superRefine((material, ctx) => {
  const ids = new Set<string>();
  material.screens.forEach((screen, index) => {
    if (ids.has(screen.id)) ctx.addIssue({ code: 'custom', path: ['screens', index, 'id'], message: 'El identificador de pantalla está repetido.' });
    ids.add(screen.id);
    if (screen.type === 'multiple-choice' && !screen.options.some((option) => option.id === screen.correctOptionId)) {
      ctx.addIssue({ code: 'custom', path: ['screens', index, 'correctOptionId'], message: 'La respuesta correcta debe coincidir con una de las opciones.' });
    }
  });
});

export type InteractiveMaterial = z.infer<typeof interactiveMaterialSchema>;
export type InteractiveScreen = InteractiveMaterial['screens'][number];

export const screenTypeLabels: Record<InteractiveScreen['type'], string> = {
  content: 'Contenido', 'multiple-choice': 'Opción múltiple', poll: 'Encuesta', 'short-answer': 'Respuesta breve',
};

export function parseInteractiveMaterial(value: unknown): InteractiveMaterial | null {
  if (value === null || value === undefined || value === '') return null;
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  if (new TextEncoder().encode(source).length > MAX_MATERIAL_BYTES) throw new Error('El archivo de material supera los 200 KB.');
  let input: unknown;
  try { input = JSON.parse(source); } catch { throw new Error('El archivo no contiene un JSON válido.'); }
  const result = interactiveMaterialSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const screenIndex = issue.path[0] === 'screens' && typeof issue.path[1] === 'number' ? `Pantalla ${issue.path[1] + 1}: ` : '';
    throw new Error(`${screenIndex}Material inválido. ${issue.message}`);
  }
  // Defaults can increase the size of a compact imported file.
  if (new TextEncoder().encode(JSON.stringify(result.data)).length > MAX_MATERIAL_BYTES) throw new Error('El material completo supera los 200 KB.');
  return result.data;
}

export function inspectInteractiveMaterial(value: unknown) {
  try { return { material: parseInteractiveMaterial(value), error: null }; }
  catch (error) { return { material: null, error: error instanceof Error ? error.message : 'No pudimos leer el material.' }; }
}

// Keep notes in a separate private field so older deployed readers can still
// parse the lesson material. Live snapshots include notes with their screens.
export function mergeTeacherNotes(value: unknown, notes: unknown): InteractiveMaterial | null {
  const material = parseInteractiveMaterial(value);
  if (!material || !notes) return material;
  const parsed = z.record(identifier, teacherNotes).parse(notes);
  return parseInteractiveMaterial({ ...material, screens: material.screens.map(screen =>
    Object.hasOwn(parsed, screen.id) ? { ...screen, teacherNotes: parsed[screen.id] } : screen) });
}

export function separateTeacherNotes(material: InteractiveMaterial | null) {
  const notes: Record<string, string> = {};
  const screens = material?.screens.map(({ teacherNotes, ...screen }) => {
    if (teacherNotes !== undefined) notes[screen.id] = teacherNotes;
    return screen;
  });
  return { material: material ? { ...material, screens: screens! } : null, teacherNotes: notes };
}

export function isInteractiveLessonReady(lesson: { status: string; class?: string; material: unknown }) {
  return lesson.status === 'ready' && Boolean(lesson.class) && Boolean(inspectInteractiveMaterial(lesson.material).material);
}

export function parseInteractiveLessonForm(form: FormData) {
  const result = z.object({
    title,
    description: z.string().trim().max(2000, 'La descripción admite hasta 2000 caracteres.'),
    class: z.string().max(64),
    status: z.enum(['draft', 'ready'], { error: 'Elegí un estado válido.' }),
  }).safeParse({ title: form.get('title'), description: form.get('description') ?? '', class: form.get('class') ?? '', status: form.get('status') ?? 'draft' });
  if (!result.success) throw new Error(result.error.issues[0].message);
  const material = parseInteractiveMaterial(form.get('material'));
  if (result.data.status === 'ready' && (!result.data.class || !material)) {
    throw new Error('Para preparar la clase, asociá una clase habitual e importá su material.');
  }
  return { ...result.data, material };
}
