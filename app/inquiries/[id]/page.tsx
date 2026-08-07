import { getInquiry } from "@/lib/actions-inquiries";
import { getHomeForRole } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await getInquiry(id);
  if (!result.success || !result.data) notFound();
  if (!result.data.course || user.role === "admin") redirect(getHomeForRole(user.role));

  const area = user.role === "docente" ? "docentes" : "estudiantes";
  redirect(`/${area}/cursos/${result.data.course}/consultas/${id}`);
}
