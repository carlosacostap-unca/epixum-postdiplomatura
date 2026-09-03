import AppShell from "@/components/shell/AppShell";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/lib/course-role-access";
import { isAdmin } from "@/lib/course-roles";

export default async function DeliveryToolsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaceAccess = await getWorkspaceAccess(user);
  const activeWorkspace = isAdmin(user) ? "admin" : "docente";
  if (!workspaceAccess.available.includes(activeWorkspace)) redirect("/");

  return (
    <AppShell user={user} workspaceAccess={workspaceAccess} activeWorkspace={activeWorkspace} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ""}>
      {children}
    </AppShell>
  );
}
