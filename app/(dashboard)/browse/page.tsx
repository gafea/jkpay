import { ensureBrowseHistoryAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export default async function BrowsePage() {
  await ensureBrowseHistoryAccess();

  const benefits = await prisma.benefit.findMany({
    include: {
      cardLinks: {
        include: { card: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Browse Benefits</h1>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Cashback</th>
                <th className="px-3 py-2 font-medium">Expiry</th>
                <th className="px-3 py-2 font-medium">Linked cards</th>
                <th className="px-3 py-2 font-medium">Quota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
            {benefits.map((benefit) => (
              <tr key={benefit.id}>
                <td className="px-3 py-2">{benefit.categoryName}</td>
                <td className="px-3 py-2">
                  {benefit.cashbackType === 'PERCENTAGE'
                    ? `${benefit.cashbackAmount.toString()}%`
                    : benefit.cashbackAmount.toString()}
                </td>
                <td className="px-3 py-2">{benefit.expiryDate?.toISOString().slice(0, 10) ?? '-'}</td>
                <td className="px-3 py-2">{benefit.cardLinks.map((link) => link.card.name).join(', ') || '-'}</td>
                <td className="px-3 py-2">{benefit.usageAvailable ?? '-'}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
