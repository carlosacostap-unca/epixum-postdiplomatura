import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (user?.role === "docente") {
    redirect("/docentes");
  }

  if (user?.role === "admin") {
    redirect("/admin/courses");
  }

  if (user?.role === "estudiante") {
    redirect("/estudiantes");
  }

  redirect("/login");
}
