import { BEGINNER_NOTICE } from "@/lib/course-onboarding";

export function LiveClassRequirements({ beginner = false }: { beginner?: boolean }) {
  return <section aria-labelledby="live-requirements-title" className="space-y-5">
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]" aria-hidden="true">laptop_chromebook</span>
      <div><h2 id="live-requirements-title" className="font-headline text-2xl font-bold">Preparate para las clases en vivo</h2><p className="mt-2 text-[var(--color-on-surface-variant)]">Durante los encuentros realizaremos prácticas con herramientas de inteligencia artificial. Para participar, necesitás:</p></div>
    </div>
    <ul className="list-disc space-y-3 pl-6">
      <li><strong>Una computadora con conexión a Internet</strong>, desde la que puedas seguir la clase y realizar las actividades.</li>
      <li><strong>Acceso a una herramienta de IA</strong>, como ChatGPT, Gemini, Claude o similar. Podés usar una versión gratuita: <strong>no es necesario pagar una suscripción</strong>.</li>
      <li><strong>Conocimientos previos de uso de alguna de estas herramientas</strong>, como iniciar una conversación, escribir consultas y continuar el intercambio.</li>
    </ul>
    <p>Este curso está dirigido a personas que ya saben utilizar alguna herramienta de inteligencia artificial. Trabajaremos sobre pensamiento crítico y resolución de problemas con su ayuda; <strong>no enseñaremos a utilizarlas desde cero</strong>.</p>
    <p className="rounded-xl bg-[var(--color-surface-container-highest)] p-4">Antes de cada encuentro, comprobá tu conexión e iniciá sesión en la herramienta que vayas a usar, para poder comenzar las prácticas junto con el grupo.</p>
    {beginner && <p role="note" className="rounded-xl bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] p-4 text-[var(--color-warning)]">{BEGINNER_NOTICE}</p>}
  </section>;
}
