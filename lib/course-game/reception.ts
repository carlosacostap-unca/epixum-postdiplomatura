import { DEFAULT_CHARACTER } from './onboarding';
export const RECEPTIONIST={...DEFAULT_CHARACTER,body:'mujer' as const,hair:'largo' as const,shirt:'azul' as const,outfit:'blusa' as const};
export const RECEPTION_ANSWERS={
 '¿De qué se trata el curso?':'Vamos a aprender a formular problemas, revisar respuestas de la IA y tomar decisiones con criterio propio. Podés trabajar sobre situaciones cotidianas o laborales.',
 '¿Cómo se juega?':'Hacé clic o tap en el suelo para caminar; también podés usar flechas o WASD. Entrá al Aula 1, hablá con los personajes y tocá una notebook para hacer las actividades. El perro puede darte pistas.',
 '¿Cómo son las clases?':'El curso se organiza en ocho encuentros. Por ahora está habilitada la Clase 1. Carlos va a presentar la propuesta y mostrar cómo recorrer el juego.',
 '¿Dónde consulto materiales y entregas?':'Las notebooks permiten consultar actividades y materiales de la clase. Desde Menú podés abrir Misiones para consultar los trabajos y Mi diario para ver tus notas.',
 '¿Jugar cuenta como asistencia o aprobación?':'Las actividades del juego son práctica. No registran automáticamente asistencia ni aprueban trabajos. Seguí las indicaciones del docente y las consignas publicadas en Epixum.',
};
