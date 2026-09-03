import { getUserParticipationSummaries, getUsers } from "@/lib/data";
import UserRoleSelect from "@/components/UserRoleSelect";
import { Badge, DataTable, PageHeader, Select, type DataColumn } from "@/components/ui";
import type { User } from "@/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const valueOf = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || "" : value || "";

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = valueOf(params.q).trim().toLocaleLowerCase("es");
  const role = valueOf(params.role);
  const [users, summaries] = await Promise.all([getUsers(), getUserParticipationSummaries()]);
  const filtered = users
    .filter((user) => !query || `${user.name} ${user.email}`.toLocaleLowerCase("es").includes(query))
    .filter((user) => {
      const summary = summaries[user.id];
      if (role === "admin") return user.role === "admin";
      if (role === "docente") return Boolean(summary?.teaching.length);
      if (role === "estudiante") return Boolean(summary?.studying.length);
      return true;
    });
  const columns: DataColumn<User>[] = [
    { id: "user", header: "Usuario", render: (user) => <div><p className="font-bold">{user.name || "Sin nombre"}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">@{user.username}</p></div> },
    { id: "email", header: "Correo", render: (user) => <span className="break-all">{user.email}</span> },
    { id: "participations", header: "Participaciones", render: (user) => {
      const summary = summaries[user.id] || { teaching: [], studying: [] };
      return <div className="min-w-56 space-y-2">
        {summary.teaching.length ? <div><Badge tone="info">Docente</Badge><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{summary.teaching.map((course) => course.title).join(", ")}</p></div> : null}
        {summary.studying.length ? <div><Badge>Estudiante</Badge><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{summary.studying.map((course) => course.title).join(", ")}</p></div> : null}
        {!summary.teaching.length && !summary.studying.length ? <span className="text-sm text-[var(--color-on-surface-variant)]">Sin cursos</span> : null}
      </div>;
    } },
    { id: "admin", header: "Acceso", render: (user) => <UserRoleSelect user={user} /> },
  ];
  return <div className="p-6 md:p-10 xl:p-12"><PageHeader eyebrow="Administración" title="Usuarios" description="Buscá personas, consultá sus cursos y administrá el privilegio global." /><form className="mt-8 grid gap-3 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-4 md:grid-cols-[1fr_14rem_auto]" role="search"><label className="sr-only" htmlFor="user-search">Buscar usuarios</label><input id="user-search" name="q" defaultValue={valueOf(params.q)} placeholder="Buscar por nombre o correo" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4" /><label className="sr-only" htmlFor="user-role">Participación</label><Select id="user-role" name="role" defaultValue={role}><option value="">Todas las participaciones</option><option value="estudiante">Estudiantes</option><option value="docente">Docentes</option><option value="admin">Administradores</option></Select><button className="min-h-11 rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold">Aplicar</button></form><p className="my-5 text-sm text-[var(--color-on-surface-variant)]" role="status">{filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"}</p><DataTable ariaLabel="Usuarios de la plataforma" items={filtered} columns={columns} getKey={(user) => user.id} /></div>;
}
