import { z } from 'zod';
import { onboardingProfileSchema } from '@/lib/course-onboarding';
import type { User } from '@/types';

export const PLATFORM_URL = 'https://www.epixum.com';
export const TOUR_VERSION = 1;
export const petNameSchema = z.string().trim().min(1, 'Elegí un nombre para tu mascota.').max(24, 'Usá hasta 24 caracteres.');
const characterFieldsSchema = z.object({
  petName: petNameSchema.default('Perro robot'),
  body: z.enum(['hombre', 'mujer']),
  skin: z.enum(['clara', 'media', 'morena', 'oscura']),
  hair: z.enum(['corto', 'largo', 'rizado', 'pelado', 'coleta']),
  beard: z.enum(['ninguna', 'corta', 'completa']).default('ninguna'),
  hairColor: z.enum(['castano', 'negro', 'rubio', 'pelirrojo']),
  eyes: z.enum(['marron', 'azul', 'verde']),
  shirt: z.enum(['verde', 'azul', 'violeta', 'rojo', 'ocre']),
  outfit: z.enum(['camisa', 'jardinero', 'blusa', 'vestido', 'falda']),
  trousers: z.enum(['azul', 'marron', 'gris']),
  accessory: z.enum(['ninguno', 'anteojos', 'sombrero']),
}).strict();
export type Character = z.infer<typeof characterFieldsSchema>;
export const CHARACTER_OPTIONS: Record<Character['body'], {
  hair: Character['hair'][]; beard: Character['beard'][];
  outfit: Character['outfit'][]; accessory: Character['accessory'][];
}> = {
  hombre: { hair:['corto','rizado','pelado'], beard:['ninguna','corta','completa'], outfit:['camisa','jardinero'], accessory:['ninguno','anteojos','sombrero'] },
  mujer: { hair:['largo','corto','rizado','coleta'], beard:['ninguna'], outfit:['blusa','falda','vestido','camisa','jardinero'], accessory:['ninguno','anteojos','sombrero'] },
};
/** Apply the editor's catalog to legacy records and server submissions alike. */
export function normalizeCharacter(character: Character): Character {
  const options=CHARACTER_OPTIONS[character.body];
  return {...character,
    hair:options.hair.includes(character.hair)?character.hair:options.hair[0],
    beard:options.beard.includes(character.beard)?character.beard:options.beard[0],
    outfit:options.outfit.includes(character.outfit)?character.outfit:options.outfit[0],
    accessory:options.accessory.includes(character.accessory)?character.accessory:options.accessory[0],
  };
}
export const characterSchema = characterFieldsSchema.transform(normalizeCharacter);
export const DEFAULT_CHARACTER: Character = { petName: 'Perro robot', body: 'hombre', skin: 'media', hair: 'corto', beard: 'ninguna', hairColor: 'castano', eyes: 'marron', shirt: 'verde', outfit: 'camisa', trousers: 'azul', accessory: 'ninguno' };
export const gameProfileSchema = onboardingProfileSchema.omit({ emailChangeRequested: true }).extend({ contactEmail: z.email('Ingresá un email de contacto válido.').max(254).transform(value => value.toLowerCase()) });
export const enrollmentCharacterSchema = z.object({ character: characterSchema, profile: gameProfileSchema }).strict();
export type GameProfile = z.infer<typeof gameProfileSchema>;
export type ProfileDraft = Omit<GameProfile, 'confirmed'> & { confirmed: boolean };
export interface GameWelcomeState { character: Character | null; profile: ProfileDraft; tourStep: number; completed: boolean }
export interface GameProgress { character: Character; tourStep: number; completed: boolean }
export type WelcomeResult = { success: true; progress: GameProgress } | { success: false; error: string };
export type WelcomeActions = { save: (input: unknown) => Promise<WelcomeResult>; update?: (input: unknown) => Promise<WelcomeResult>; advance: (step: number) => Promise<WelcomeResult> };

export const TOUR_STEPS = [
  { title: 'Bienvenido al valle', description: 'Este es tu personaje. El Nodo Tecnológico Catamarca es la sede de tu curso: todas tus clases están allí. Hacé clic o tap en el suelo para caminar; también podés usar las flechas del teclado o WASD.', target: 'map' },
  { title: 'Encontrá tus clases', description: 'Caminá hasta el acceso central del Nodo: al cruzarlo entrás al pasillo. Caminá hacia una puerta de aula y tocá una notebook para acceder a las actividades y materiales. Cerca de la entrada también podés presionar E. Dentro del menú, Encuentros reúne todas las clases en una lista accesible.', target: 'encounters' },
  { title: 'Tus misiones', description: 'Dentro del menú, los trabajos prácticos aparecen en Misiones cuando el docente los publica. Desde allí abrís las consignas, entregas y devoluciones.', target: 'missions' },
  { title: 'Un diario para ver tu avance', description: 'Mi diario, dentro del menú, muestra los trabajos aprobados. Abrir una clase no registra asistencia ni aprobación: el avance viene de tus entregas reales.', target: 'journal' },
  { title: 'El menú y la salida', description: 'El menú permite pausar animaciones, consultar ayuda y abrir el aula clásica. Volver a Epixum te lleva a www.epixum.com. Ya estás listo para comenzar.', target: 'menu' },
] as const;

export function initialGameProfile(user: Pick<User, 'firstName' | 'lastName' | 'dni' | 'phone' | 'birthDate' | 'email'>): ProfileDraft {
  return { firstName: user.firstName || '', lastName: user.lastName || '', dni: user.dni || '', phone: user.phone || '', birthDate: user.birthDate?.slice(0, 10) || '', contactEmail: user.email || '', confirmed: false };
}

export function completedTourSteps(steps: number[]) {
  const done = new Set(steps);
  let count = 0;
  while (count < TOUR_STEPS.length && done.has(count + 1)) count++;
  return count;
}
