import { ensureBrowseHistoryAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export default async function BrowsePage() {
  await ensureBrowseHistoryAccess();

  const benefits = await prisma.benefit.findMany({
    where: { isEnabled: true },
    include: {
      cardLinks: {
        include: { card: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>Browse Benefits</h1>
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Cashback</th>
              <th>Expiry</th>
              <th>Linked cards</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {benefits.map((benefit) => (
              <tr key={benefit.id}>
                <td>{benefit.categoryName}</td>
                <td>
                  {benefit.cashbackType === 'PERCENTAGE'
                    ? `${benefit.cashbackAmount.toString()}%`
                    : benefit.cashbackAmount.toString()}
                </td>
                <td>{benefit.expiryDate.toISOString().slice(0, 10)}</td>
                <td>{benefit.cardLinks.map((link) => link.card.name).join(', ')}</td>
                <td>{benefit.usageAvailable ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
