import { Skeleton } from "@/components/ui";

export default function RoleRouteLoading({ label }: { label: string }) {
  return (
    <div className="space-y-8 p-6 md:p-10 xl:p-12" role="status" aria-label={`Cargando ${label}`}>
      <span className="sr-only">Cargando {label}</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-[min(28rem,80%)]" />
        <Skeleton className="h-5 w-[min(38rem,95%)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
