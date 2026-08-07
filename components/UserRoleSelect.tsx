"use client";

import { useState } from "react";
import { updateUserRole } from "@/lib/actions";
import type { User, UserRole } from "@/types";
import { ConfirmDialog, Select, useToast } from "@/components/ui";

export default function UserRoleSelect({ user }: { user: User }) {
  const { notify } = useToast();
  const [currentRole, setCurrentRole] = useState<UserRole>(user.role);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmChange = async () => {
    if (!pendingRole) return;
    setLoading(true);
    try {
      const result = await updateUserRole(user.id, pendingRole);
      if (!result.success) throw new Error(result.error || "No se pudo cambiar el rol.");
      setCurrentRole(pendingRole);
      notify({ title: "Rol actualizado", description: `${user.name || user.email} ahora tiene el rol ${pendingRole}.`, tone: "success" });
      setPendingRole(null);
    } catch (error: unknown) {
      notify({ title: "No pudimos cambiar el rol", description: error instanceof Error ? error.message : "Intentá nuevamente.", tone: "error", duration: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Select aria-label={`Rol de ${user.name || user.email}`} value={currentRole} onChange={(event) => setPendingRole(event.target.value as UserRole)} disabled={loading}>
        <option value="estudiante">Estudiante</option><option value="docente">Docente</option><option value="admin">Administrador</option>
      </Select>
      <ConfirmDialog open={Boolean(pendingRole)} onOpenChange={(open) => !open && setPendingRole(null)} title="Confirmar cambio de rol" description={<>Vas a cambiar el acceso de <strong>{user.name || user.email}</strong> de {currentRole} a {pendingRole}. El cambio afecta sus permisos inmediatamente.</>} confirmLabel="Cambiar rol" onConfirm={confirmChange} isPending={loading} tone={pendingRole === "admin" ? "danger" : "default"} />
    </>
  );
}
