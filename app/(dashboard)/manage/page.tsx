import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ManageGrid } from './manage-grid';

const WEEKDAY_OPTIONS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const CHANNEL_OPTIONS = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];

type ServerVariableCard = {
  key: string;
  value: string;
  readOnly: boolean;
};

const getEnvFileKeys = () => {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return [] as string[];
  }

  const content = readFileSync(envPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
      return normalized.split('=')[0]?.trim() ?? '';
    })
    .filter((key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key));
};

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
  const envKeys = getEnvFileKeys();
  const serverVariables: ServerVariableCard[] = envKeys
    .map((key) => {
      const rawValue = process.env[key] ?? '';
      const isSecret = key.toLowerCase().includes('secret');
      return {
        key,
        value: isSecret ? '***' : rawValue,
        readOnly: !key.startsWith('DYNAMIC_'),
      };
    })
    .sort((a, b) => {
      if (a.readOnly !== b.readOnly) {
        return a.readOnly ? 1 : -1;
      }
      return a.key.localeCompare(b.key);
    });

  return (
    <ManageGrid
      friends={friends.map((friend: FriendRow) => ({
        id: friend.id,
        email: friend.friend.email,
        nickname: friend.nickname ?? '',
        fcmToken: friend.fcmToken ?? '',
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
        quotaType: benefit.quotaType,
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
      serverVariables={serverVariables}
    />
  );
}
