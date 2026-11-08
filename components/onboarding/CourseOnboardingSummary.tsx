import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { getStudentOnboarding } from "@/lib/course-onboarding-data";
import { onboardingStep } from "@/lib/course-onboarding";
import { LiveClassRequirements } from "./LiveClassRequirements";

export async function CourseOnboardingSummary({ courseId, compact = false }: { courseId: string; compact?: boolean }) {
  const data = await getStudentOnboarding(courseId);
  const step = onboardingStep(data.progress, data.survey);
  if (compact) return <section className={`student-onboarding ${step === 4 ? "is-complete" : "is-pending"}`} aria-label="Onboarding del curso">
    {step !== 4 && <div className="student-onboarding-pending"><strong>Completá tu presentación</strong><p>Etapa {step} de 3 pendiente. Verificá tus datos, respondé la encuesta y conocé los requisitos.</p><Link className="student-text-action" href={`/estudiantes/cursos/${courseId}/onboarding`}>Continuar onboarding →</Link></div>}
    <details><summary><span className="material-symbols-outlined" aria-hidden="true">{step === 4 ? "check_circle" : "info"}</span>{step === 4 ? "Onboarding completo" : "Ver requisitos de las prácticas"}</summary><div><Link className="student-text-action" href={`/estudiantes/cursos/${courseId}/onboarding`}>Ver mi onboarding →</Link><LiveClassRequirements beginner={data.survey?.answers.experience === "never"} /></div></details>
  </section>;
  return <Card><CardContent className="space-y-7 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-outline-variant)] pb-6">
      <div><p className="text-sm font-bold text-[var(--color-primary)]">{step === 4 ? "Onboarding completado" : `Bienvenida · Etapa ${step} de 3 pendiente`}</p><h2 className="mt-1 text-xl font-bold">{step === 4 ? "Tu presentación está completa" : "Completá tu presentación al curso"}</h2>{step !== 4 && <p className="mt-2 text-sm">Verificá tus datos, respondé la encuesta inicial y conocé los requisitos.</p>}</div>
      <Link className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 font-bold text-[var(--color-on-primary)]" href={`/estudiantes/cursos/${courseId}/onboarding`}>{step === 4 ? "Ver mi onboarding" : "Continuar onboarding"}</Link>
    </div>
    <LiveClassRequirements beginner={data.survey?.answers.experience === "never"} />
  </CardContent></Card>;
}
