import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { ManageGrid } from './manage-grid';

const WEEKDAY_OPTIONS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const CHANNEL_OPTIONS = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];

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
  type FriendRow = (typeof friends)[number];
  type CardRow = (typeof cards)[number];
  type BenefitRow = (typeof benefits)[number];

  return (
    <ManageGrid
      friends={friends.map((friend: FriendRow) => ({
        id: friend.id,
        email: friend.friend.email,
        nickname: friend.nickname ?? '',
        activeUntil: friend.activeUntil ? friend.activeUntil.toISOString().slice(0, 10) : '',
        isDisabled: friend.isDisabled,
      }))}
      cards={cards.map((card: CardRow) => ({
        id: card.id,
        name: card.name,
        fcyFee: card.fcyFee?.toString() ?? '',
        isCredit: card.isCredit,
        isDisabled: card.isDisabled,
      }))}
      benefits={benefits.map((benefit: BenefitRow) => ({
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
        linkedCardIds: benefit.cardLinks.map((link: BenefitRow['cardLinks'][number]) => link.cardId),
      }))}
      weekdayOptions={WEEKDAY_OPTIONS}
      channelOptions={CHANNEL_OPTIONS}
    />
  );
}
