import { getClass } from "@/lib/data";
import { getHomeForRole } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const classData = await getClass(id).catch(() => null);
  if (!classData) notFound();
  if (!classData.course || user.role === "admin") redirect(getHomeForRole(user.role));

  const area = user.role === "docente" ? "docentes" : "estudiantes";
  redirect(`/${area}/cursos/${classData.course}/clases/${id}`);
}
