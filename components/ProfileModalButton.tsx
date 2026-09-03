"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { updateUserProfile } from "@/lib/actions-users";
import type { User } from "@/types";
import { Badge, Button, Dialog, Field, useToast } from "@/components/ui";
import { cx } from "@/components/ui/styles";
import Image from "next/image";

interface ProfileModalButtonProps {
  children?: ReactNode;
  className?: string;
  pocketbaseUrl: string;
  user: User;
}
interface ProfileFormData {
  birthDate: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
}

type ProfileField = keyof ProfileFormData;
type ProfileErrors = Partial<Record<ProfileField, string>>;

const inputClassName =
  "w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-[var(--color-on-surface)] transition-colors hover:border-[var(--color-on-surface-variant)] disabled:opacity-50";

function getInitialFormData(user: User): ProfileFormData {
  const nameParts = user.name?.trim().split(/\s+/) ?? [];
  return {
    firstName: user.firstName || nameParts[0] || "",
    lastName: user.lastName || nameParts.slice(1).join(" ") || "",
    phone: user.phone || "",
    dni: user.dni || "",
    birthDate: user.birthDate ? user.birthDate.substring(0, 10) : "",
  };
}

function validateProfile(data: ProfileFormData): ProfileErrors {
  const errors: ProfileErrors = {};
  if (data.firstName.length > 80) errors.firstName = "El nombre no puede superar los 80 caracteres.";
  if (data.lastName.length > 80) errors.lastName = "El apellido no puede superar los 80 caracteres.";
  if (data.dni && !/^\d{7,10}$/.test(data.dni)) errors.dni = "Ingresá entre 7 y 10 números, sin puntos.";
  if (data.phone && !/^[+\d][\d\s()-]{5,29}$/.test(data.phone)) errors.phone = "Ingresá un teléfono válido.";
  if (data.birthDate && new Date(`${data.birthDate}T12:00:00Z`).getTime() > Date.now()) {
    errors.birthDate = "La fecha de nacimiento no puede estar en el futuro.";
  }
  return errors;
}

function ProfileAvatar({ user, pocketbaseUrl }: { user: User; pocketbaseUrl: string }) {
  const initials = (user.firstName || user.name || user.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (user.avatar) {
    return (
      <Image
        unoptimized
        alt={`Avatar de ${user.name || "usuario"}`}
        className="size-24 rounded-full object-cover"
        src={`${pocketbaseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`}
        width={96}
        height={96}
      />
    );
  }

  return (
    <span className="flex size-24 items-center justify-center rounded-full bg-[var(--color-primary)] font-headline text-2xl font-black text-[var(--color-on-primary)]" aria-hidden="true">
      {initials}
    </span>
  );
}

export default function ProfileModalButton({ children, className, pocketbaseUrl, user }: ProfileModalButtonProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(() => getInitialFormData(user));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [serverError, setServerError] = useState("");

  const roleLabel = user.role === "admin" ? "Administrador" : "Cuenta Epixum";
  const errorMessages = Object.values(errors);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsEditing(false);
      setErrors({});
      setServerError("");
      setFormData(getInitialFormData(user));
    }
  };

  const updateField = (field: ProfileField, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized: ProfileFormData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dni: formData.dni.trim(),
      phone: formData.phone.trim(),
      birthDate: formData.birthDate,
    };
    const nextErrors = validateProfile(normalized);
    setFormData(normalized);
    setErrors(nextErrors);
    setServerError("");

    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const result = await updateUserProfile(user.id, normalized);
      if (!result.success) {
        setServerError(result.error || "No pudimos actualizar tu perfil.");
        return;
      }

      notify({ title: "Perfil actualizado", description: "Tus datos ya están guardados.", tone: "success" });
      setIsEditing(false);
      router.refresh();
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : "No pudimos actualizar tu perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cx(
          "flex min-h-14 w-full items-center gap-3 rounded-[var(--epixum-radius-lg)] px-3 text-left transition-colors hover:bg-[var(--color-surface-container)]",
          className,
        )}
        aria-label="Abrir mi perfil"
      >
        {children ?? <span>Mi perfil</span>}
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={isEditing ? "Editar perfil" : "Mi perfil"}
        description={isEditing ? "Actualizá tus datos personales. Los campos pueden dejarse vacíos." : "Información asociada a tu cuenta de Epixum."}
        footer={
          isEditing ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" form="profile-form" isPending={isSaving} pendingLabel="Guardando…">Guardar cambios</Button>
            </>
          ) : (
            <Button leadingIcon={<span className="material-symbols-outlined" aria-hidden="true">edit</span>} onClick={() => setIsEditing(true)}>
              Editar perfil
            </Button>
          )
        }
      >
        {isEditing ? (
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-5 py-3" noValidate>
            {errorMessages.length > 0 || serverError ? (
              <div className="rounded-[var(--epixum-radius-md)] bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] p-4 text-sm text-[var(--color-error)]" role="alert">
                <p className="font-bold">Revisá los datos antes de guardar.</p>
                {serverError ? <p className="mt-1">{serverError}</p> : null}
                {errorMessages.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">{errorMessages.map((message) => <li key={message}>{message}</li>)}</ul>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre" error={errors.firstName}>
                <input value={formData.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={inputClassName} autoComplete="given-name" />
              </Field>
              <Field label="Apellido" error={errors.lastName}>
                <input value={formData.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={inputClassName} autoComplete="family-name" />
              </Field>
            </div>

            <Field label="Teléfono" hint="Podés incluir código de país y área." error={errors.phone}>
              <input type="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClassName} autoComplete="tel" />
            </Field>

            <Field label="DNI" hint="Solo números, sin puntos." error={errors.dni}>
              <input inputMode="numeric" value={formData.dni} onChange={(event) => updateField("dni", event.target.value)} className={inputClassName} autoComplete="off" />
            </Field>

            <Field label="Fecha de nacimiento" error={errors.birthDate}>
              <input type="date" value={formData.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} className={inputClassName} autoComplete="bday" />
            </Field>
          </form>
        ) : (
          <div className="py-3">
            <div className="flex flex-col items-center text-center">
              <ProfileAvatar user={user} pocketbaseUrl={pocketbaseUrl} />
              <h3 className="mt-5 font-headline text-2xl font-bold">{user.name || "Usuario"}</h3>
              <Badge tone="success" className="mt-2">{roleLabel}</Badge>
            </div>

            <dl className="mt-8 grid gap-4 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container)] p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Correo</dt>
                <dd className="mt-1 break-words text-sm">{user.email || "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Teléfono</dt>
                <dd className="mt-1 text-sm">{user.phone || "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">DNI</dt>
                <dd className="mt-1 text-sm">{user.dni || "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Nacimiento</dt>
                <dd className="mt-1 text-sm">
                  {user.birthDate
                    ? new Date(user.birthDate).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
                    : "No especificada"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Dialog>
    </>
  );
}
