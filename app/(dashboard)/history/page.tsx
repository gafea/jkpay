import { createBenefitRequest } from '@/app/actions/history';
import { ensureBrowseHistoryAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { PurchaseChannel } from '@prisma/client';

export default async function HistoryPage() {
  const user = await ensureBrowseHistoryAccess();

  const [benefits, requests] = await Promise.all([
    prisma.benefit.findMany({
      orderBy: { categoryName: 'asc' },
      select: { id: true, categoryName: true },
    }),
    prisma.benefitRequest.findMany({
      where: { userId: user.id },
      include: { benefit: { select: { categoryName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Request History</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Submit Request</h2>
        <form action={createBenefitRequest}>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Benefit
              <select
                name="benefitId"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select benefit</option>
                {benefits.map((benefit) => (
                  <option key={benefit.id} value={benefit.id}>
                    {benefit.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Amount spent
              <input
                type="number"
                step="0.01"
                name="amountSpent"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Purchase channel
              <select
                name="purchaseChannel"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select channel</option>
                {Object.values(PurchaseChannel).map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Submit request
          </button>
        </form>
      </section>

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
            {requests.map((request) => (
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
