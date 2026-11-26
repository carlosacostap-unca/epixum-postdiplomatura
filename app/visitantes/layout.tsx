import { redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { getCurrentUser } from '@/lib/pocketbase-server';
import { getWorkspaceAccess } from '@/lib/course-role-access';

export default async function VisitingTeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <AppShell activeWorkspace="docente_visitante" user={user} workspaceAccess={await getWorkspaceAccess(user)} pocketbaseUrl={process.env.NEXT_PUBLIC_POCKETBASE_URL || ''}>
    {children}
  </AppShell>;
}
