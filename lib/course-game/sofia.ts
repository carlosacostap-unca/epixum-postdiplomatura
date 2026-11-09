import { z } from 'zod';
import { DEFAULT_CHARACTER } from './onboarding';
export const SOFIA = {...DEFAULT_CHARACTER, body:'mujer' as const, hair:'coleta' as const, shirt:'violeta' as const, outfit:'blusa' as const};
export const SOFIA_QUESTIONS = {
  '¿Cuánto tiempo tenés para estudiar?':'Tengo seis días, pero entre el trabajo y otras tareas puedo estudiar una hora por día. En total son seis horas, no seis días completos.',
  '¿Qué sabés de los seis temas?':'No parto de cero, pero no conozco todos los temas igual. Necesito comprobar cuáles domino y cuáles me cuestan antes de repartir el tiempo.',
  '¿Cuánto trabajo estimás que falta?':'Mi primera estimación es de doce horas para preparar todo. Es una estimación: tendría que revisarla con un diagnóstico. Con las seis horas disponibles, el plan inicial no alcanza.',
};
export type SofiaProgress = { clues:string[]; available:string; needed:string; verdict:string; actions:string[]; reflection:string; reviewed:boolean; hintLevel?:number };
export const INITIAL_SOFIA:SofiaProgress = {clues:[],available:'',needed:'',verdict:'',actions:[],reflection:'',reviewed:false};
export const SOFIA_ACTIONS = ['Diagnosticar qué temas domina y cuáles cuestan','Priorizar y reservar un momento para repasar','Pedirle a la IA que garantice que aprobará','Revisar con Sofía si puede ajustar tiempo o alcance'];
export function sofiaFeedback(p:SofiaProgress):string[] {
 const notes:string[]=[];
 if(p.clues.length<3) notes.push('Todavía falta información: conversá con Sofía sobre el tiempo, sus conocimientos y el esfuerzo estimado.');
 if(Number(p.available)!==6 || Number(p.needed)!==12) notes.push('Distinguí días de horas: una hora por día durante seis días son seis horas disponibles, frente a doce horas estimadas.');
 if(p.verdict!=='adaptar') notes.push('Podés conservar la idea de organizar el estudio, pero hace falta adaptar el plan al tiempo y a los conocimientos de Sofía.');
 if(!p.actions.includes(SOFIA_ACTIONS[0]) || !p.actions.includes(SOFIA_ACTIONS[1])) notes.push('Antes de repartir el tiempo, proponé un diagnóstico y una priorización con repaso.');
 if(p.actions.includes(SOFIA_ACTIONS[2])) notes.push('Una IA no puede garantizar que Sofía apruebe. El resultado depende de más factores que el plan.');
 if(p.reflection.trim().length<30) notes.push('Explicá con tus palabras qué cambiarías y qué información necesitás comprobar.');
 return notes;
}
export function sofiaHint(p:SofiaProgress,level:number) {
 const hints=p.clues.length<3 ? ['Antes de evaluar la respuesta, pensá qué no sabe la IA sobre Sofía.','Preguntale cuánto tiempo tiene, qué sabe y cuánto esfuerzo estima que falta.','Seis días no equivalen a seis días completos de estudio. Buscá las horas disponibles y comparalas con las necesarias.'] : ['¿El plan entra en el tiempo disponible? Hacé la cuenta antes de decidir.','Compará las seis horas disponibles con las doce estimadas. ¿Qué tendrías que revisar?','Conservá la organización, pero diagnosticá, priorizá y revisá los tiempos con Sofía. La decisión necesita tu justificación.'];
 return hints[Math.min(level,2)];
}

export const sofiaProgressSchema = z.object({
 clues:z.array(z.string().refine(q=>Object.hasOwn(SOFIA_QUESTIONS,q))).max(3).refine(a=>new Set(a).size===a.length),
 available:z.string().max(16),needed:z.string().max(16),verdict:z.enum(['','copiar','adaptar','descartar']),
 actions:z.array(z.string().refine(a=>SOFIA_ACTIONS.includes(a))).max(4).refine(a=>new Set(a).size===a.length),
 reflection:z.string().max(1500),reviewed:z.boolean(),hintLevel:z.number().int().min(0).max(2).optional(),
}).strict();
export type SaveSofia = (progress:SofiaProgress)=>Promise<{success:true}|{success:false;error:string}>;
