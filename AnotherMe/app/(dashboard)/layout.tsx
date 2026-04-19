import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getAuthenticatedUserFromCookieStore } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUserFromCookieStore();
  if (!user) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
