import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { getWorkspaceAccess } from "@/lib/course-role-access";

export default async function EstudiantesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const workspaceAccess = await getWorkspaceAccess(user);

  return (
    <AppShell user={user} workspaceAccess={workspaceAccess} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ""}>
      {children}
    </AppShell>
  );
}
