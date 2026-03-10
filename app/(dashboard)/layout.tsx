import { Sidebar } from '@/components/sidebar';
import { ensureBrowseHistoryAccess, isOwnerEmail } from '@/lib/access';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureBrowseHistoryAccess();
  const owner = isOwnerEmail(user.email);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar userName={user.name} userEmail={user.email} isOwner={owner} />
      <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
