import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import { getAuthenticatedUserFromCookieStore } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUserFromCookieStore();
  if (!user) {
    redirect('/login');
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
