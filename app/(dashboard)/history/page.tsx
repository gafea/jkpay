import { createBenefitRequest } from '@/app/actions/history';
import { ensureBrowseHistoryAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { PurchaseChannel } from '@prisma/client';

export default async function HistoryPage() {
  const user = await ensureBrowseHistoryAccess();

  const [benefits, requests] = await Promise.all([
    prisma.benefit.findMany({
      where: { isEnabled: true },
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
    <div>
      <h1>Request History</h1>

      <section className="card">
        <h2>Submit Request</h2>
        <form action={createBenefitRequest}>
          <div className="form-grid">
            <label>
              Benefit
              <select name="benefitId" required>
                <option value="">Select benefit</option>
                {benefits.map((benefit) => (
                  <option key={benefit.id} value={benefit.id}>
                    {benefit.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount spent
              <input type="number" step="0.01" name="amountSpent" required />
            </label>
            <label>
              Purchase channel
              <select name="purchaseChannel" required>
                <option value="">Select channel</option>
                {Object.values(PurchaseChannel).map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit">Submit request</button>
        </form>
      </section>

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Requested at</th>
              <th>Benefit</th>
              <th>Amount spent</th>
              <th>Channel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.createdAt.toISOString().replace('T', ' ').slice(0, 16)}</td>
                <td>{request.benefit.categoryName}</td>
                <td>{request.amountSpent.toString()}</td>
                <td>{request.purchaseChannel}</td>
                <td>{request.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
