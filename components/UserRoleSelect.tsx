"use client";

import { useState } from "react";
import { updateUserAdminAccess } from "@/lib/actions";
import type { User } from "@/types";
import { ConfirmDialog, Select, useToast } from "@/components/ui";

export default function UserRoleSelect({ user }: { user: User }) {
  const { notify } = useToast();
  const [isAdministrator, setIsAdministrator] = useState(user.role === "admin");
  const [pendingAccess, setPendingAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmChange = async () => {
    if (pendingAccess === null) return;
    setLoading(true);
    try {
      const result = await updateUserAdminAccess(user.id, pendingAccess);
      if (!result.success) throw new Error(result.error || "No se pudo cambiar el acceso.");
      setIsAdministrator(pendingAccess);
      notify({ title: "Acceso actualizado", description: `${user.name || user.email} ${pendingAccess ? "ahora administra la plataforma" : "ya no tiene privilegios administrativos"}.`, tone: "success" });
      setPendingAccess(null);
    } catch (error: unknown) {
      notify({ title: "No pudimos cambiar el rol", description: error instanceof Error ? error.message : "Intentá nuevamente.", tone: "error", duration: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Select aria-label={`Acceso administrativo de ${user.name || user.email}`} value={isAdministrator ? "admin" : "cuenta"} onChange={(event) => setPendingAccess(event.target.value === "admin")} disabled={loading}>
        <option value="cuenta">Cuenta Epixum</option><option value="admin">Administrador</option>
      </Select>
      <ConfirmDialog open={pendingAccess !== null} onOpenChange={(open) => !open && setPendingAccess(null)} title="Confirmar acceso administrativo" description={<>Vas a {pendingAccess ? "conceder" : "retirar"} el privilegio administrativo de <strong>{user.name || user.email}</strong>. Sus cursos como docente y estudiante se conservarán.</>} confirmLabel="Confirmar" onConfirm={confirmChange} isPending={loading} tone={pendingAccess ? "danger" : "default"} />
    </>
  );
}
