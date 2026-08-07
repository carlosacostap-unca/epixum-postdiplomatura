import { getHomeForRole } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyClassesPage() {
  const user = await getCurrentUser();
  redirect(user ? getHomeForRole(user.role) : "/login");
}
