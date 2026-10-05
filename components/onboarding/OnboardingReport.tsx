import FormattedDate from "@/components/FormattedDate";
import { Card, CardContent, StatCard } from "@/components/ui";
import { getOnboardingReport } from "@/lib/course-onboarding-data";
import { hasPaidAccess, surveyOptions, surveyQuestions, type OnboardingSurvey } from "@/lib/course-onboarding";

type Data = Awaited<ReturnType<typeof getOnboardingReport>>;
function SurveyAnswers({ answers }: { answers: OnboardingSurvey }) {
  return <dl className="grid gap-4 md:grid-cols-2">
    {(Object.keys(surveyOptions) as (keyof typeof surveyOptions)[]).map(key => {
      const raw = answers[key];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const labels = values.map(value => surveyOptions[key].find(([id]) => id === value)?.[1] || value);
      return <div key={key}><dt className="text-sm font-bold">{surveyQuestions[key]}</dt><dd className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{labels.join(" · ") || "No corresponde"}</dd></div>;
    })}
    {([["Otras herramientas", answers.otherTools], ["Otro uso", answers.otherUses], ["Herramientas pagas y plan", answers.paidTools], [surveyQuestions.problem, answers.problem]] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-sm font-bold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}
  </dl>;
}
export function OnboardingReport({ data }: { data: Data }) {
  const { participants } = data;
  const surveys = participants.flatMap(item => item.survey ? [item.survey] : []);
  return <div className="space-y-7">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Invitados y matriculados" value={participants.length} />
      <StatCard label="Datos confirmados" value={participants.filter(p => p.progress?.profileConfirmedAt).length} />
      <StatCard label="Encuestas enviadas" value={surveys.length} />
      <StatCard label="Onboarding completo" value={participants.filter(p => p.progress?.completedAt).length} />
    </div>
    <Card><CardContent><h2 className="text-xl font-bold">Diagnóstico inicial</h2><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Los conteos consideran únicamente encuestas enviadas. El acceso pago puede tener más de un pagador; las opciones no se suman como personas distintas.</p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div><h3 className="mb-3 font-bold">Experiencia con IA</h3><ul className="space-y-2">{surveyOptions.experience.map(([id, label]) => <li key={id} className="flex justify-between gap-4 text-sm"><span>{label}</span><strong>{surveys.filter(s => s.answers.experience === id).length}</strong></li>)}</ul></div>
        <div><h3 className="mb-3 font-bold">Acceso a herramientas pagas: {surveys.filter(s => hasPaidAccess(s.answers)).length}</h3><ul className="space-y-2">{surveyOptions.paidAccess.map(([id, label]) => <li key={id} className="flex justify-between gap-4 text-sm"><span>{label}</span><strong>{surveys.filter(s => s.answers.paidAccess.includes(id)).length}</strong></li>)}</ul></div>
      </div>
    </CardContent></Card>
    <section className="space-y-3" aria-label="Avance por alumno">
      <h2 className="text-xl font-bold">Avance por alumno</h2>
      {participants.length === 0 && <p>Todavía no hay invitados ni matriculados.</p>}
      {participants.map(p => <details key={p.id} className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <summary className="cursor-pointer"><span className="font-bold">{p.name}</span><span className="ml-3 text-sm text-[var(--color-on-surface-variant)]">{p.progress?.completedAt ? "Completado" : p.survey ? "Falta aceptar requisitos" : p.progress?.profileConfirmedAt ? "Encuesta pendiente" : "Datos sin confirmar"}</span></summary>
        <div className="mt-5 space-y-5">
          <p className="break-all text-sm">{p.email}</p>
          <ul className="space-y-2 text-sm"><li>Datos personales: {p.progress?.profileConfirmedAt ? <FormattedDate date={p.progress.profileConfirmedAt} showTime /> : "Pendiente"}</li><li>Encuesta: {p.survey ? <FormattedDate date={p.survey.created} showTime /> : "Pendiente"}</li><li>Requisitos: {p.progress?.requirementsAcceptedAt ? <FormattedDate date={p.progress.requirementsAcceptedAt} showTime /> : "Pendiente"}</li></ul>
          {data.admin && p.progress?.emailChangeRequested && <p className="break-all rounded-xl bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] p-4 text-sm text-[var(--color-warning)]">Solicita cambiar su email a <strong>{p.progress.emailChangeRequested}</strong>. Requiere validación administrativa; la cuenta actual sigue vigente.</p>}
          {p.survey && <SurveyAnswers answers={p.survey.answers} />}
        </div>
      </details>)}
    </section>
  </div>;
}
