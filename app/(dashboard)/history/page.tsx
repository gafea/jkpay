import { ensureBrowseHistoryAccess } from '@/lib/access';
import { resetMonthlyBenefitUsage } from '@/lib/benefits';
import { prisma } from '@/lib/prisma';

export default async function HistoryPage() {
  const user = await ensureBrowseHistoryAccess();
  await resetMonthlyBenefitUsage();

  const requests = await prisma.benefitRequest.findMany({
    where: { userId: user.id },
    include: { benefit: { select: { categoryName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  type RequestRow = (typeof requests)[number];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Request History</h1>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Requested at</th>
                <th className="px-3 py-2 font-medium">Benefit</th>
                <th className="px-3 py-2 font-medium">Amount spent</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {requests.map((request: RequestRow) => (
                <tr key={request.id}>
                  <td className="px-3 py-2">{request.createdAt.toISOString().replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-3 py-2">{request.benefit.categoryName}</td>
                  <td className="px-3 py-2">{request.amountSpent.toString()}</td>
                  <td className="px-3 py-2">{request.purchaseChannel}</td>
                  <td className="px-3 py-2">{request.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
