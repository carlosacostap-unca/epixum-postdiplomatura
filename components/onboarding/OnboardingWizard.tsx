"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, CardContent, Field } from "@/components/ui";
import { acceptOnboardingRequirements, confirmOnboardingProfile, saveOnboardingSurvey } from "@/lib/actions-course-onboarding";
import { onboardingStep, surveyOptions, surveyQuestions, SURVEY_INTRO, REQUIREMENTS_ACK, BEGINNER_NOTICE, hasPaidAccess, surveyDraftSchema, type OnboardingSurvey, type CourseOnboarding, type SubmittedOnboardingSurvey } from "@/lib/course-onboarding";
import { LiveClassRequirements } from "./LiveClassRequirements";

type Profile = { firstName: string; lastName: string; dni: string; birthDate: string; phone: string; email: string };
type Props = { courseId: string; profile: Profile; progress: CourseOnboarding | null; survey: SubmittedOnboardingSurvey | null; enrolled: boolean };
const control = "w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3";

export function OnboardingWizard({ courseId, profile, progress, survey, enrolled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  const [answers, setAnswers] = useState<OnboardingSurvey>(() => surveyDraftSchema.parse(survey?.answers || progress?.surveyDraft || {}));
  const [emailCorrection, setEmailCorrection] = useState(false);
  const step = onboardingStep(progress, survey);

  function run(action: () => Promise<{ success: boolean; error?: string }>, message?: string) {
    setFeedback({});
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) { setFeedback({ error: result.error || "No pudimos guardar los cambios." }); return; }
        setFeedback({ message });
        router.refresh();
      } catch { setFeedback({ error: "No pudimos conectar. Tus respuestas siguen en pantalla; intentá guardarlas nuevamente." }); }
    });
  }
  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => confirmOnboardingProfile(courseId, { ...Object.fromEntries(form), confirmed: form.get("confirmed") === "on", emailChangeRequested: emailCorrection ? String(form.get("emailChangeRequested") || "").trim() : "" }));
  }
  function setSingle(key: "experience" | "frequency" | "verification", value: string) {
    setAnswers(current => ({ ...current, [key]: value, ...(key === "experience" && value === "never" ? { frequency: "none" } : {}) }));
  }
  function toggle(key: "tools" | "uses" | "strategies" | "paidAccess" | "goals", value: string) {
    const exclusive = key === "paidAccess" ? ["no", "private"] : key === "tools" ? ["unknown"] : key === "strategies" ? ["not_yet"] : [];
    setAnswers(current => {
      const values = current[key];
      const next = values.includes(value) ? values.filter(item => item !== value)
        : exclusive.includes(value) ? [value] : [...values.filter(item => !exclusive.includes(item)), value];
      return { ...current, [key]: next };
    });
  }
  function question(key: keyof typeof surveyOptions, number: number, multiple = false) {
    const selected = answers[key];
    return <fieldset className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
      <legend className="max-w-full px-2 font-bold">{number}. {surveyQuestions[key]}</legend>
      <p className="text-sm text-[var(--color-on-surface-variant)]">{key === "goals" ? "Elegí entre uno y tres objetivos." : multiple ? "Podés elegir varias opciones." : "Elegí una opción."}</p>
      {surveyOptions[key].map(([value, label]) => {
        const checked = Array.isArray(selected) ? selected.includes(value) : selected === value;
        return <label key={value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-[var(--color-surface-container)]">
          <input className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" type={multiple ? "checkbox" : "radio"} name={key} value={value} checked={checked} disabled={pending || (key === "goals" && answers.goals.length >= 3 && !checked)}
            onChange={() => multiple ? toggle(key as "tools", value) : setSingle(key as "experience", value)} />
          <span>{label}</span>
        </label>;
      })}
    </fieldset>;
  }

  return <div className="space-y-6">
    <ol aria-label="Etapas de bienvenida" className="grid gap-3 sm:grid-cols-3">
      {["Tus datos", "Tu experiencia con IA", "Clases en vivo"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={`rounded-xl border p-4 ${step === index + 1 ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-outline-variant)]"}`}>
        <span className="text-sm font-semibold text-[var(--color-primary)]">{step > index + 1 ? "Completado" : `Etapa ${index + 1}`}</span><p className="mt-1 font-bold">{label}</p>
      </li>)}
    </ol>
    <Card><CardContent className="space-y-6 md:p-8">
      {step === 1 && <form onSubmit={saveProfile} className="space-y-6">
        <div><h2 className="font-headline text-2xl font-bold">Verificá tus datos personales</h2><p className="mt-2 text-[var(--color-on-surface-variant)]">Revisá los datos que tenemos registrados y corregí o completá lo que haga falta.</p></div>
        <fieldset disabled={pending} className="grid gap-5 md:grid-cols-2">
          <Field label="Apellido/s" required><input className={control} name="lastName" autoComplete="family-name" defaultValue={profile.lastName} maxLength={120} /></Field>
          <Field label="Nombre/s" required><input className={control} name="firstName" autoComplete="given-name" defaultValue={profile.firstName} maxLength={120} /></Field>
          <Field label="DNI" required hint="Sin puntos, entre 7 y 8 dígitos."><input className={control} name="dni" inputMode="numeric" defaultValue={profile.dni} maxLength={12} /></Field>
          <Field label="Fecha de nacimiento" required><input className={control} name="birthDate" type="date" defaultValue={profile.birthDate} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Teléfono" required><input className={control} name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone} maxLength={30} /></Field>
          <Field label="Email de tu cuenta" hint="Es el email con el que iniciás sesión."><input className={control} type="email" value={profile.email} readOnly /></Field>
        </fieldset>
        <label className="flex items-center gap-3"><input type="checkbox" checked={emailCorrection} disabled={pending} onChange={event => setEmailCorrection(event.target.checked)} className="size-5" />Necesito corregir mi email</label>
        {emailCorrection && <Field label="Email que querés utilizar" required hint="Guardaremos tu solicitud para que administración la revise. Hasta que se valide el cambio, seguí ingresando con tu cuenta actual."><input className={control} name="emailChangeRequested" type="email" maxLength={254} disabled={pending} /></Field>}
        <label className="flex items-start gap-3"><input className="mt-1 size-5 shrink-0" type="checkbox" name="confirmed" required disabled={pending} /><span>Confirmo que mis datos son correctos{emailCorrection ? ", salvo el cambio de email que solicito." : "."}</span></label>
        <Button type="submit" isPending={pending} pendingLabel="Guardando…">Confirmar datos y continuar</Button>
      </form>}
      {step === 2 && <form className="space-y-7" onSubmit={event => { event.preventDefault(); run(() => saveOnboardingSurvey(courseId, answers, true)); }}>
        <div><h2 className="font-headline text-2xl font-bold">Tu experiencia con inteligencia artificial</h2><p className="mt-2 text-[var(--color-on-surface-variant)]">Encuesta inicial · 4–5 minutos</p><p className="mt-4">{SURVEY_INTRO}</p></div>
        {question("experience", 1)}
        {answers.experience === "never" && <p role="note" className="rounded-xl bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] p-4 text-[var(--color-warning)]">{BEGINNER_NOTICE}</p>}
        {question("frequency", 2)}
        {answers.experience !== "never" && <>
          {question("tools", 3, true)}
          {answers.tools.includes("other") && <Field label="Otras herramientas"><input className={control} value={answers.otherTools} maxLength={300} disabled={pending} onChange={e => setAnswers({ ...answers, otherTools: e.target.value })} /></Field>}
          {question("uses", 4, true)}
          {answers.uses.includes("other") && <Field label="Otro uso"><input className={control} value={answers.otherUses} maxLength={300} disabled={pending} onChange={e => setAnswers({ ...answers, otherUses: e.target.value })} /></Field>}
          {question("strategies", 5, true)}
          {question("verification", 6)}
        </>}
        {question("paidAccess", 7, true)}
        {hasPaidAccess(answers) && <Field label="¿Qué herramientas pagas?" hint="Indicá sus nombres y, si lo sabés, el plan. No necesitamos importes."><input className={control} value={answers.paidTools} maxLength={500} disabled={pending} onChange={e => setAnswers({ ...answers, paidTools: e.target.value })} /></Field>}
        {question("goals", 8, true)}
        <Field label={`9. ${surveyQuestions.problem}`} hint="Opcional. Evitá incluir datos personales de otras personas o información confidencial."><textarea className={control} rows={4} value={answers.problem} maxLength={1500} disabled={pending} onChange={e => setAnswers({ ...answers, problem: e.target.value })} /></Field>
        <p className="text-sm text-[var(--color-on-surface-variant)]">Podés guardar un borrador para seguir otro día. Al enviarla, la encuesta quedará registrada como tu diagnóstico inicial.</p>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={pending} onClick={() => run(() => saveOnboardingSurvey(courseId, answers, false), "Borrador guardado. Podés continuar más tarde.")}>Guardar borrador</Button><Button type="submit" isPending={pending} pendingLabel="Guardando…">Enviar encuesta y continuar</Button></div>
      </form>}
      {step === 3 && <form className="space-y-6" onSubmit={event => { event.preventDefault(); const accepted = new FormData(event.currentTarget).get("accepted") === "on"; run(() => acceptOnboardingRequirements(courseId, accepted)); }}>
        <LiveClassRequirements beginner={survey?.answers.experience === "never"} />
        <label className="flex items-start gap-3"><input className="mt-1 size-5 shrink-0" type="checkbox" name="accepted" required disabled={pending} /><span>{REQUIREMENTS_ACK}</span></label>
        <Button type="submit" isPending={pending} pendingLabel="Finalizando…">Completar onboarding</Button>
      </form>}
      {step === 4 && <div className="space-y-6">
        <div role="status"><span className="material-symbols-outlined text-4xl text-[var(--color-primary)]" aria-hidden="true">task_alt</span><h2 className="mt-2 font-headline text-2xl font-bold">Ya completaste tu presentación al curso</h2><p className="mt-3">Tus datos fueron confirmados, tu encuesta quedó registrada y aceptaste los requisitos de participación.</p></div>
        {progress?.emailChangeRequested && <p>Tu solicitud de cambio de email está registrada para revisión administrativa. Seguí ingresando con tu cuenta actual.</p>}
        {!enrolled && <p>Te falta activar la invitación con la contraseña del curso para acceder a las clases.</p>}
        <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={enrolled ? `/estudiantes/cursos/${courseId}` : "/estudiantes"}>{enrolled ? "Ir al resumen del curso" : "Volver a mis invitaciones"}</Link>
        <LiveClassRequirements beginner={survey?.answers.experience === "never"} />
      </div>}
      {feedback.error && <p role="alert" className="rounded-xl bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] p-4 text-[var(--color-error)]">{feedback.error}</p>}
      {feedback.message && <p role="status" className="rounded-xl bg-[var(--color-surface-container-highest)] p-4">{feedback.message}</p>}
    </CardContent></Card>
  </div>;
}
