import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';
import { ToastProvider } from '@/components/admin/toast';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <AdminShell user={{ name: session.user.name, email: session.user.email }}>
      <ToastProvider>{children}</ToastProvider>
    </AdminShell>
  );
}
