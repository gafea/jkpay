import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { ensureOwnerAccessApi } from '@/lib/access-api';
import { prisma } from '@/lib/prisma';
import { CHANNEL_OPTIONS, WEEKDAY_OPTIONS } from '@/app/types';
import type { ApiManageResponse } from '@/lib/api-types';

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

const isServerVariablesEnabled = () => process.env.ALLOW_SERVER_VARIABLES?.toLowerCase() === 'true';

export async function GET(request: Request) {
  const access = await ensureOwnerAccessApi(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

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

  const serverVariables = isServerVariablesEnabled()
    ? getEnvFileKeys()
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
        })
    : [];

  const payload: ApiManageResponse = {
    friends: friends.map((friend) => ({
      id: friend.id,
      email: friend.friend.email,
      nickname: friend.nickname ?? '',
      fcmToken: friend.fcmToken ?? '',
      activeUntil: friend.activeUntil ? friend.activeUntil.toISOString().slice(0, 10) : '',
      isDisabled: friend.isDisabled,
    })),
    cards: cards.map((card) => ({
      id: card.id,
      name: card.name,
      fcyFee: card.fcyFee?.toString() ?? '',
      isCredit: card.isCredit,
      isDisabled: card.isDisabled,
    })),
    benefits: benefits.map((benefit) => ({
      id: benefit.id,
      categoryTags: benefit.categoryTags,
      referenceUrl: benefit.referenceUrl ?? '',
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
      linkedCardIds: benefit.cardLinks.map((link) => link.cardId),
    })),
    weekdayOptions: WEEKDAY_OPTIONS,
    channelOptions: CHANNEL_OPTIONS,
    serverVariables,
  };

  return NextResponse.json(payload);
}
