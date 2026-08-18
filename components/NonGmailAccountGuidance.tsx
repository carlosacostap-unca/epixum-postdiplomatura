const GOOGLE_ACCOUNT_HELP_URL =
  "https://support.google.com/accounts/answer/27441?hl=es-419";

export default function NonGmailAccountGuidance() {
  return (
    <section
      aria-labelledby="non-gmail-guidance-title"
      className="rounded-[1rem] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)]/55 p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined mt-0.5 text-xl text-[var(--color-primary)]"
          aria-hidden="true"
        >
          alternate_email
        </span>
        <div className="min-w-0 space-y-2">
          <h2
            id="non-gmail-guidance-title"
            className="font-headline text-sm font-bold text-[var(--color-on-surface)]"
          >
            ¿Tu correo no termina en @gmail.com?
          </h2>
          <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Podés ingresar con Hotmail, Yahoo u otro correo si está asociado a
            una Cuenta de Google. No necesitás cambiar la dirección que fue
            autorizada para el curso.
          </p>
          <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Al continuar, elegí en Google exactamente el mismo email que figura
            en tu invitación.
          </p>
          <a
            href={GOOGLE_ACCOUNT_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-bold text-[var(--color-primary)] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
          >
            Crear una Cuenta de Google con mi correo actual
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              open_in_new
            </span>
          </a>
          <p className="text-xs leading-5 text-[var(--color-on-surface-variant)]">
            Si después de ingresar no ves la invitación, contactá a la
            administración para revisar el email autorizado.
          </p>
        </div>
      </div>
    </section>
  );
}
