export function InitialExamPhoto({ courseId, attemptId, available }: { courseId: string; attemptId: string; available: boolean }) {
  if (!available) return null;
  return <div className="rounded-xl border border-[var(--color-outline-variant)] p-4"><p className="font-semibold">Foto inicial del intento</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">Una única foto al iniciar. Acceso reservado a administradores y docentes del curso.</p><a href={`/api/preparacion/${courseId}/intentos/${attemptId}/foto`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">Ver foto inicial</a></div>;
}
