import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/lib/course-role-access";
import { getHomeForWorkspace } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const workspaceAccess = await getWorkspaceAccess(user);
  redirect(getHomeForWorkspace(workspaceAccess.preferred));
}
