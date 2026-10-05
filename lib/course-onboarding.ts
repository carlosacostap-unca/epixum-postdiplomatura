import { z } from "zod";

export const ONBOARDING_VERSION = 1;
export const surveyOptions = {
  experience: [
    ["never", "Nunca las usé."], ["tried", "Las probé algunas veces."],
    ["assisted", "Las uso para tareas concretas, aunque todavía necesito ayuda."],
    ["independent", "Las uso con autonomía en distintas tareas."],
    ["integrated", "Las integro en procesos de trabajo o automatizaciones."],
  ],
  frequency: [
    ["none", "No las usé."], ["less_weekly", "Menos de una vez por semana."],
    ["weekly", "Una o dos veces por semana."], ["frequent", "Tres a cinco días por semana."],
    ["daily", "Todos o casi todos los días."],
  ],
  tools: [["chatgpt", "ChatGPT"], ["gemini", "Gemini"], ["copilot", "Microsoft Copilot"], ["claude", "Claude"], ["perplexity", "Perplexity"], ["other", "Otras"], ["unknown", "Usé alguna, pero no recuerdo su nombre."]],
  uses: [
    ["study", "Estudiar o comprender temas."], ["research", "Buscar información."],
    ["writing", "Redactar, corregir o resumir textos."], ["ideas", "Generar ideas o planificar."],
    ["data", "Analizar datos o trabajar con planillas."], ["media", "Crear imágenes, audio o video."],
    ["code", "Programar o automatizar tareas."], ["problems", "Comparar opciones o resolver problemas."], ["other", "Otro uso"],
  ],
  strategies: [
    ["rephrase", "Reformulo la pregunta."], ["context", "Agrego contexto, ejemplos o instrucciones."],
    ["review", "Pido explicaciones o revisiones."], ["switch", "Pruebo otra herramienta."],
    ["research", "Busco información por mi cuenta."], ["stop", "Dejo de intentarlo."], ["not_yet", "Todavía no me pasó."],
  ],
  verification: [["never", "Nunca."], ["rarely", "Pocas veces."], ["sometimes", "Algunas veces."], ["often", "Casi siempre."], ["always", "Siempre."], ["not_applied", "Todavía no usé sus respuestas en una tarea concreta."]],
  paidAccess: [["personal", "Sí, pago una suscripción o consumo personalmente."], ["institution", "Sí, la paga mi trabajo o una institución."], ["someone_else", "Sí, otra persona paga el acceso que utilizo."], ["no", "No."], ["private", "Prefiero no responder."]],
  goals: [
    ["prompts", "Formular mejores preguntas e instrucciones."], ["errors", "Detectar errores, sesgos e información inventada."],
    ["sources", "Verificar respuestas y fuentes."], ["problems", "Resolver problemas con ayuda de la IA."],
    ["decisions", "Comparar alternativas y tomar decisiones fundamentadas."], ["privacy", "Cuidar los datos personales y la información confidencial."],
    ["application", "Aplicar estas herramientas al estudio o al trabajo."],
  ],
} as const;

export const surveyQuestions = {
  experience: "¿Cuál de estas opciones describe mejor tu experiencia con herramientas de inteligencia artificial?",
  frequency: "Durante los últimos 30 días, ¿con qué frecuencia las usaste?",
  tools: "¿Qué herramientas de IA usaste?",
  uses: "¿Para qué las usás?",
  strategies: "Cuando una respuesta de la IA no te sirve, ¿qué hacés habitualmente?",
  verification: "Antes de usar información que te da una IA, ¿con qué frecuencia comprobás que sea correcta?",
  paidAccess: "¿Actualmente tenés acceso a alguna herramienta de IA paga?",
  goals: "¿Qué te gustaría aprender o mejorar durante el curso?",
  problem: "Contanos una tarea o problema concreto en el que te gustaría recibir ayuda de la IA.",
};
export const SURVEY_INTRO = "Queremos conocer tu experiencia con la inteligencia artificial para adaptar las clases y actividades. No necesitás conocimientos previos para responder esta encuesta. No tiene respuestas correctas o incorrectas y no afecta tu evaluación. Respondé según tu experiencia actual.";
export const BEGINNER_NOTICE = "Para aprovechar este curso necesitás familiarizarte con el uso básico de alguna herramienta de IA antes de participar en las prácticas.";
export const REQUIREMENTS_ACK = "Leí los requisitos y entiendo cómo debo prepararme para participar en las clases en vivo.";

type ChoiceKey = keyof typeof surveyOptions;
function choice(key: ChoiceKey) {
  const values = surveyOptions[key].map(([value]) => value);
  return z.string().refine(value => values.some(option => option === value), "Elegí una opción válida.");
}
function choices(key: ChoiceKey) {
  return z.array(choice(key)).max(surveyOptions[key].length).refine(values => new Set(values).size === values.length, "Hay opciones repetidas.");
}
const optionalText = (max: number) => z.string().trim().max(max, `Usá hasta ${max} caracteres.`).default("");
export const surveyDraftSchema = z.object({
  experience: choice("experience").optional(), frequency: choice("frequency").optional(),
  tools: choices("tools").default([]), otherTools: optionalText(300),
  uses: choices("uses").default([]), otherUses: optionalText(300),
  strategies: choices("strategies").default([]), verification: choice("verification").optional(),
  paidAccess: choices("paidAccess").default([]), paidTools: optionalText(500),
  goals: choices("goals").max(3, "Elegí hasta tres objetivos.").default([]), problem: optionalText(1500),
});
export type OnboardingSurvey = z.infer<typeof surveyDraftSchema>;
export const surveySchema = surveyDraftSchema.superRefine((data, ctx) => {
  const issue = (path: keyof OnboardingSurvey, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (!data.experience) issue("experience", "Indicá tu experiencia.");
  if (!data.frequency) issue("frequency", "Indicá la frecuencia de uso.");
  if (data.experience === "never" && data.frequency !== "none") issue("frequency", "Si nunca usaste IA, elegí «No las usé».");
  if (data.experience !== "never") {
    for (const key of ["tools", "uses", "strategies"] as const) if (!data[key].length) issue(key, "Elegí al menos una opción.");
    if (!data.verification) issue("verification", "Indicá cómo verificás las respuestas.");
    if (data.tools.includes("other") && !data.otherTools) issue("otherTools", "Indicá qué otras herramientas usaste.");
    if (data.uses.includes("other") && !data.otherUses) issue("otherUses", "Contanos el otro uso.");
    if (data.tools.includes("unknown") && data.tools.length > 1) issue("tools", "No recuerdo su nombre es una opción excluyente.");
    if (data.strategies.includes("not_yet") && data.strategies.length > 1) issue("strategies", "Todavía no me pasó es una opción excluyente.");
  }
  if (!data.paidAccess.length) issue("paidAccess", "Indicá tu acceso a herramientas pagas.");
  if (data.paidAccess.some(value => value === "no" || value === "private") && data.paidAccess.length > 1) issue("paidAccess", "No y Prefiero no responder no se combinan con otras opciones.");
  if (hasPaidAccess(data) && !data.paidTools) issue("paidTools", "Indicá las herramientas pagas a las que tenés acceso; el plan es opcional.");
  if (!data.goals.length) issue("goals", "Elegí entre uno y tres objetivos.");
}).transform(cleanSurvey);

export function hasPaidAccess(survey: Pick<OnboardingSurvey, "paidAccess">) {
  return survey.paidAccess.some(value => ["personal", "institution", "someone_else"].includes(value));
}
export function cleanSurvey(data: OnboardingSurvey): OnboardingSurvey {
  return {
    ...data,
    ...(data.experience === "never" ? { tools: [], uses: [], strategies: [], verification: undefined, otherTools: "", otherUses: "" } : {}),
    otherTools: data.experience !== "never" && data.tools.includes("other") ? data.otherTools : "",
    otherUses: data.experience !== "never" && data.uses.includes("other") ? data.otherUses : "",
    paidTools: hasPaidAccess(data) ? data.paidTools : "",
  };
}
export function titleCaseName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es").replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("es"));
}
export function validBirthDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= now.toISOString().slice(0, 10);
}
const personName = z.string().trim().min(1, "Completá este dato.").max(120).transform(titleCaseName);
export const onboardingProfileSchema = z.object({
  firstName: personName, lastName: personName,
  dni: z.string().transform(value => value.replace(/[.\s]/g, "")).pipe(z.string().regex(/^\d{7,8}$/, "Ingresá un DNI de 7 u 8 dígitos.")),
  birthDate: z.string().refine(value => validBirthDate(value), "Ingresá una fecha de nacimiento válida, no futura."),
  phone: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+?\d{7,15}$/, "Ingresá un teléfono de 7 a 15 dígitos.")),
  emailChangeRequested: z.union([z.literal(""), z.email()]).default(""),
  confirmed: z.literal(true, { error: "Confirmá que tus datos son correctos." }),
});
export interface CourseOnboarding {
  id: string; course: string; student: string; profileConfirmedAt: string;
  surveyDraft?: OnboardingSurvey; emailChangeRequested: string;
  requirementsAcceptedAt: string; requirementsVersion: number; completedAt: string;
}
export interface SubmittedOnboardingSurvey {
  id: string; course: string; student: string; answers: OnboardingSurvey; version: number; created: string;
}
export function onboardingStep(progress: CourseOnboarding | null, survey: SubmittedOnboardingSurvey | null) {
  if (!progress?.profileConfirmedAt) return 1;
  if (!survey) return 2;
  return progress.completedAt ? 4 : 3;
}
