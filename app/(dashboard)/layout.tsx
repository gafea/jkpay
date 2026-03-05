import { Sidebar } from '@/components/sidebar';
import { ensureBrowseHistoryAccess, isOwnerEmail } from '@/lib/access';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await ensureBrowseHistoryAccess();
  const owner = isOwnerEmail(user.email);

  return (
    <div className="shell">
      <Sidebar userEmail={user.email} isOwner={owner} />
      <main className="content">{children}</main>
    </div>
  );
}
