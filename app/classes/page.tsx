import { getWorkspaceAccess } from "@/lib/course-role-access";
import { getHomeForWorkspace } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(getHomeForWorkspace((await getWorkspaceAccess(user)).preferred));
}
