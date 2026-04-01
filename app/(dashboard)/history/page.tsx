import { ensureBrowseHistoryAccess } from '@/lib/access';
import { fetchServerApi } from '@/lib/server-api';
import type { ApiHistoryResponse } from '@/lib/api-types';

export default async function HistoryPage() {
  await ensureBrowseHistoryAccess();
  const { requests } = await fetchServerApi<ApiHistoryResponse>('/api/history');

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
                <th className="px-3 py-2 font-medium">Spendings</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-3 py-2">
                    {new Date(request.createdAt).toISOString().replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className="px-3 py-2">{request.benefitName}</td>
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
