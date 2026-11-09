import {DEFAULT_CHARACTER,type Character} from './onboarding';
export type WorkshopPerson='lucia'|'mateo'|'ana';
export type WorkshopStage='brief'|'gather'|'prompt'|'review'|'context'|'final'|'complete';
export type WorkshopProgress={stage:WorkshopStage;clues:string[];checked:boolean;contextShared:boolean;reasons:string[]};
export const INITIAL_WORKSHOP:WorkshopProgress={stage:'brief',clues:[],checked:false,contextShared:false,reasons:[]};
export const WORKSHOP_PEOPLE:Record<WorkshopPerson,{name:string;role:string;y:number;character:Character}>={
 lucia:{name:'Lucía',role:'Coordinación del taller',y:895,character:{...DEFAULT_CHARACTER,body:'mujer',hair:'coleta',outfit:'blusa',shirt:'verde'}},
 mateo:{name:'Mateo',role:'Equipamiento',y:780,character:{...DEFAULT_CHARACTER,hair:'corto',beard:'corta',shirt:'azul'}},
 ana:{name:'Ana',role:'Referente del grupo',y:670,character:{...DEFAULT_CHARACTER,body:'mujer',hair:'largo',outfit:'blusa',shirt:'violeta'}},
};
export const WORKSHOP_QUESTIONS:Record<WorkshopPerson,{id:string;question:string;answer:string;note:string}[]>={
 lucia:[{id:'goal',question:'¿Qué necesitamos lograr y con cuánto tiempo contamos?',answer:'Que puedan redactar una consulta útil a una IA y revisar si la respuesta sirve para una tarea cotidiana. Tenemos 90 minutos y 18 personas inscriptas.',note:'Lucía · Confirmado: objetivo de redactar y revisar una consulta; 90 minutos; 18 personas.'}],
 mateo:[{id:'equipment',question:'¿Con qué equipos y conexión contamos?',answer:'Hay seis notebooks funcionando. La conexión a internet a veces se interrumpe. Todavía no preguntamos si traen teléfonos o datos móviles: no lo daría por hecho.',note:'Mateo · Confirmado: 6 notebooks y conexión inestable. Pendiente: teléfonos y datos móviles.'}],
 ana:[{id:'group',question:'¿Qué experiencia e intereses tiene el grupo?',answer:'Algunas personas ya probaron la IA y otras nunca la usaron. Les interesa escribir mensajes, entender instrucciones y organizar tareas. No sabemos si todas tienen cuenta.',note:'Ana · Confirmado: experiencia diversa e intereses cotidianos. Pendiente: cuentas de acceso.'}],
};
export const INITIAL_PLAN='Taller de tres horas para treinta participantes. Cada persona trabajará con una notebook y una cuenta propia. Introducción, ejercicios individuales y presentación de resultados.';
export const WORKSHOP_PROMPT='Diseñá un taller de IA generativa. Objetivo: redactar una consulta útil y revisar la respuesta. Condiciones confirmadas: 18 personas, 90 minutos, 6 notebooks, conexión inestable y experiencia diversa. No están confirmados los teléfonos ni las cuentas. Proponé actividades y tiempos, una alternativa sin internet y qué debemos verificar. No des por ciertos los datos pendientes.';
export const REVISED_PLAN=[['Bienvenida y objetivo',15],['Demostración',20],['Práctica en grupos',40],['Puesta en común',25]] as const;
export const FINAL_PLAN=[['Presentación del objetivo',10],['Demostración guiada',15],['Práctica en seis grupos de tres',35],['Comparación y revisión de respuestas',20],['Cierre',10]] as const;
export const WORKSHOP_REASONS=['Respeta los 90 minutos','Usa las seis notebooks en grupos de tres','Incluye una alternativa sin internet','Mantiene visibles las cuentas y materiales pendientes'];
export const WORKSHOP_STAGE_LABELS:Record<WorkshopStage,string>={brief:'Revisá el pedido de Lucía',gather:'Conversá con Lucía, Mateo y Ana',prompt:'Usá el planificador en tu notebook del Aula 1',review:'Comprobá la propuesta contra los datos',context:'Probá una conversación sin contexto',final:'Volvé con Lucía y justificá la propuesta',complete:'Taller revisado'};
export function workshopReady(p:WorkshopProgress){return ['goal','equipment','group'].every(id=>p.clues.includes(id));}
export function workshopCanComplete(p:WorkshopProgress){return p.stage==='final'&&workshopReady(p)&&p.checked&&p.contextShared&&WORKSHOP_REASONS.every(r=>p.reasons.includes(r));}
export function workshopHint(p:WorkshopProgress){return p.stage==='brief'?'Lucía tiene un plan que parece completo. ¿Qué datos se confirmaron?':p.stage==='gather'?'Buscá el objetivo y las condiciones con Lucía, los equipos con Mateo y la experiencia con Ana.':p.stage==='review'?'Sumá los minutos. Después compará con los 90 disponibles. ¿Están listos los materiales sin internet?':p.stage==='context'?'El diario conserva las notas, pero este chat simulado empieza sin ellas. Compartí un resumen revisado.':WORKSHOP_STAGE_LABELS[p.stage];}
