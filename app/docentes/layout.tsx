import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { getCurrentUser } from "@/lib/pocketbase-server";

export default async function DocentesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  return (
    <AppShell user={user} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ""}>
      {children}
    </AppShell>
  );
}
