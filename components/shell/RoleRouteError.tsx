"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function RoleRouteError({
  error,
  reset,
  workspace,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  workspace: string;
}) {
  useEffect(() => {
    console.error(`Error en ${workspace}`, error);
  }, [error, workspace]);

  return (
    <div className="p-6 md:p-10 xl:p-12">
      <ErrorState
        title={`No pudimos abrir ${workspace}`}
        description="La información no se perdió. Podés volver a intentar la consulta desde esta misma pantalla."
        onRetry={reset}
      />
    </div>
  );
}
