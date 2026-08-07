import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <AppShell user={user} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ""}>
      {children}
    </AppShell>
  );
}
