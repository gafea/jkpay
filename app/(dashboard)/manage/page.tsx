import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import {
  addBenefit,
  addCard,
  addFriend,
  removeBenefit,
  removeCard,
  removeFriend,
  toggleBenefit,
} from '@/app/actions/manage';
import { PurchaseChannel, Weekday } from '@prisma/client';

export default async function ManagePage() {
  await ensureOwnerAccess();

  const [friends, cards, benefits] = await Promise.all([
    prisma.friendAccess.findMany({
      orderBy: { createdAt: 'desc' },
      include: { friend: { select: { email: true } } },
    }),
    prisma.card.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.benefit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cardLinks: {
          include: { card: { select: { name: true } } },
        },
      },
    }),
  ]);

  return (
    <div>
      <h1>Manage</h1>

      <section className="card">
        <h2>Friends</h2>
        <form action={addFriend}>
          <div className="form-grid">
            <label>
              Friend email
              <input type="email" name="email" required />
            </label>
            <label>
              Monthly spending limit (optional)
              <input type="number" step="0.01" name="monthlyLimit" />
            </label>
            <label>
              Activation expiry date (optional)
              <input type="date" name="activeUntil" />
            </label>
          </div>
          <button type="submit">Add friend</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Monthly limit</th>
              <th>Active until</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {friends.map((friend) => (
              <tr key={friend.id}>
                <td>{friend.friend.email}</td>
                <td>{friend.monthlyLimit?.toString() ?? '-'}</td>
                <td>{friend.activeUntil ? friend.activeUntil.toISOString().slice(0, 10) : '-'}</td>
                <td>
                  <form action={removeFriend}>
                    <input type="hidden" name="id" value={friend.id} />
                    <button type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Cards</h2>
        <form action={addCard}>
          <div className="form-grid">
            <label>
              Card name
              <input name="name" required />
            </label>
            <label>
              Expiry date
              <input type="date" name="expiryDate" required />
            </label>
            <label>
              Monthly spending limit
              <input type="number" step="0.01" name="monthlyLimit" required />
            </label>
          </div>
          <button type="submit">Add card</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expiry</th>
              <th>Monthly limit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id}>
                <td>{card.name}</td>
                <td>{card.expiryDate.toISOString().slice(0, 10)}</td>
                <td>{card.monthlyLimit.toString()}</td>
                <td>
                  <form action={removeCard}>
                    <input type="hidden" name="id" value={card.id} />
                    <button type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Benefits</h2>
        <form action={addBenefit}>
          <div className="form-grid">
            <label>
              Category name
              <input name="categoryName" required />
            </label>
            <label>
              Expiry date
              <input type="date" name="expiryDate" required />
            </label>
            <label>
              Cashback type
              <select name="cashbackType" required>
                <option value="PERCENTAGE">Percentage</option>
                <option value="ONE_TIME_CASH">One-time cash</option>
              </select>
            </label>
            <label>
              Cashback amount
              <input type="number" step="0.01" name="cashbackAmount" required />
            </label>
            <label>
              Usage available (optional)
              <input type="number" name="usageAvailable" />
            </label>
            <label>
              Minimum spending (optional)
              <input type="number" step="0.01" name="minimumSpending" />
            </label>
            <label>
              Maximum spending (optional)
              <input type="number" step="0.01" name="maximumSpending" />
            </label>
          </div>

          <label>
            Linked cards
            <select name="linkedCardIds" multiple style={{ width: '100%', minHeight: 100 }} required>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10, marginBottom: 12 }}>
            <fieldset>
              <legend>Applicable weekdays</legend>
              {Object.values(Weekday).map((day) => (
                <label key={day} style={{ display: 'block' }}>
                  <input type="checkbox" name="applicableWeekdays" value={day} /> {day}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Applicable channels</legend>
              {Object.values(PurchaseChannel).map((channel) => (
                <label key={channel} style={{ display: 'block' }}>
                  <input type="checkbox" name="purchaseChannels" value={channel} /> {channel}
                </label>
              ))}
            </fieldset>
          </div>

          <button type="submit">Add benefit</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Type/Amount</th>
              <th>Expiry</th>
              <th>Linked cards</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {benefits.map((benefit) => (
              <tr key={benefit.id}>
                <td>{benefit.categoryName}</td>
                <td>
                  {benefit.cashbackType} / {benefit.cashbackAmount.toString()}
                </td>
                <td>{benefit.expiryDate.toISOString().slice(0, 10)}</td>
                <td>{benefit.cardLinks.map((link) => link.card.name).join(', ')}</td>
                <td>{benefit.isEnabled ? 'Yes' : 'No'}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <form action={toggleBenefit}>
                    <input type="hidden" name="id" value={benefit.id} />
                    <input type="hidden" name="isEnabled" value={String(benefit.isEnabled)} />
                    <button type="submit">{benefit.isEnabled ? 'Disable' : 'Enable'}</button>
                  </form>
                  <form action={removeBenefit}>
                    <input type="hidden" name="id" value={benefit.id} />
                    <button type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
