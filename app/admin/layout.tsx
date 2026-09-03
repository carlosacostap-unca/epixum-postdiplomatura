import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { getWorkspaceAccess } from "@/lib/course-role-access";
import { isAdmin } from "@/lib/course-roles";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user)) {
    redirect("/");
  }

  const workspaceAccess = await getWorkspaceAccess(user);

  return (
    <AppShell user={user} workspaceAccess={workspaceAccess} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ""}>
      {children}
    </AppShell>
  );
}
