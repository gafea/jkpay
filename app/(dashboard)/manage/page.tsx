import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { PurchaseChannel, Weekday } from '@prisma/client';
import { ManageGrid } from './manage-grid';

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
    <ManageGrid
      friends={friends.map((friend) => ({
        id: friend.id,
        email: friend.friend.email,
        monthlyLimit: friend.monthlyLimit?.toString() ?? '',
        activeUntil: friend.activeUntil ? friend.activeUntil.toISOString().slice(0, 10) : '',
      }))}
      cards={cards.map((card) => ({
        id: card.id,
        name: card.name,
        expiryDate: card.expiryDate?.toISOString().slice(0, 10) ?? '',
        monthlyLimit: card.monthlyLimit?.toString() ?? '',
        fcyFee: card.fcyFee?.toString() ?? '',
        isCredit: card.isCredit,
      }))}
      benefits={benefits.map((benefit) => ({
        id: benefit.id,
        categoryName: benefit.categoryName,
        expiryDate: benefit.expiryDate?.toISOString().slice(0, 10) ?? '',
        cashbackType: benefit.cashbackType,
        cashbackAmount: benefit.cashbackAmount.toString(),
        usageAvailable: benefit.usageAvailable?.toString() ?? '',
        usageUsed: benefit.usageUsed,
        quotaResetsMonthly: benefit.quotaResetsMonthly,
        minimumSpending: benefit.minimumSpending?.toString() ?? '',
        maximumSpending: benefit.maximumSpending?.toString() ?? '',
        applicableWeekdays: benefit.applicableWeekdays,
        purchaseChannel: benefit.purchaseChannel || '',
        linkedCardIds: benefit.cardLinks.map((link) => link.cardId),
      }))}
      weekdayOptions={Object.values(Weekday)}
      channelOptions={Object.values(PurchaseChannel)}
    />
  );
}
