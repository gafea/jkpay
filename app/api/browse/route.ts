import { NextResponse } from 'next/server';
import { ensureBrowseHistoryAccessApi } from '@/lib/access-api';
import { resetMonthlyBenefitUsage } from '@/lib/benefits';
import { prisma } from '@/lib/prisma';
import type { ApiBrowseResponse, ApiBenefit } from '@/lib/api-types';

export async function GET(request: Request) {
  const access = await ensureBrowseHistoryAccessApi(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  await resetMonthlyBenefitUsage();

  const dbBenefits = await prisma.benefit.findMany({
    where: {
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
    },
    include: {
      cardLinks: {
        where: { card: { isDisabled: false } },
        include: { card: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const benefits: ApiBenefit[] = dbBenefits.map((benefit) => ({
    id: benefit.id,
    categoryTags: benefit.categoryTags,
    referenceUrl: benefit.referenceUrl ?? null,
    expiryDate: benefit.expiryDate ? benefit.expiryDate.toISOString() : null,
    cashbackType: benefit.cashbackType,
    cashbackAmount: Number(benefit.cashbackAmount),
    quotaType: benefit.quotaType,
    usageAvailable: benefit.usageAvailable,
    usageUsed: benefit.usageUsed,
    quotaResetsMonthly: benefit.quotaResetsMonthly,
    minimumSpending: benefit.minimumSpending === null ? null : Number(benefit.minimumSpending),
    maximumSpending: benefit.maximumSpending === null ? null : Number(benefit.maximumSpending),
    applicableWeekdays: benefit.applicableWeekdays,
    purchaseChannel: benefit.purchaseChannel,
    cardLinks: benefit.cardLinks.map((link) => ({
      cardId: link.cardId,
      card: {
        id: link.card.id,
        name: link.card.name,
        fcyFee: link.card.fcyFee === null ? null : Number(link.card.fcyFee),
        isCredit: link.card.isCredit,
      },
    })),
  }));

  const payload: ApiBrowseResponse = { benefits };
  return NextResponse.json(payload);
}
