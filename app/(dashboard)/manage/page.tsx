import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import {
  type BenefitManageRow,
  type CardManageRow,
  CHANNEL_OPTIONS,
  WEEKDAY_OPTIONS,
  type BenefitForm,
  type FriendAccessManageRow,
  type Card,
  type Friend,
  type ServerVariableCard,
} from '@/app/types';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ManageGrid } from './manage-grid';

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
      friends={
        friends.map((friend: FriendAccessManageRow) => ({
          id: friend.id,
          email: friend.friend.email,
          nickname: friend.nickname ?? '',
          fcmToken: friend.fcmToken ?? '',
          activeUntil: friend.activeUntil ? friend.activeUntil.toISOString().slice(0, 10) : '',
          isDisabled: friend.isDisabled,
        })) as Friend[]
      }
      cards={
        cards.map((card: CardManageRow) => ({
          id: card.id,
          name: card.name,
          fcyFee: card.fcyFee?.toString() ?? '',
          isCredit: card.isCredit,
          isDisabled: card.isDisabled,
        })) as Array<Omit<Card, 'fcyFee'> & { fcyFee: string }>
      }
      benefits={
        benefits.map((benefit: BenefitManageRow) => ({
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
          linkedCardIds: benefit.cardLinks.map((link: BenefitManageRow['cardLinks'][number]) => link.cardId),
        })) as BenefitForm[]
      }
      weekdayOptions={WEEKDAY_OPTIONS}
      channelOptions={CHANNEL_OPTIONS}
      serverVariables={serverVariables}
    />
  );
}
