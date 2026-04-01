import { NextResponse } from 'next/server';
import type { PurchaseChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureBrowseHistoryAccessApi } from '@/lib/access-api';
import { resetMonthlyBenefitUsage } from '@/lib/benefits';
import { prisma } from '@/lib/prisma';
import type { ApiHistoryResponse } from '@/lib/api-types';

export async function GET() {
  const access = await ensureBrowseHistoryAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  await resetMonthlyBenefitUsage();

  const requests = await prisma.benefitRequest.findMany({
    where: { userId: access.user.id },
    include: { benefit: { select: { categoryName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const payload: ApiHistoryResponse = {
    requests: requests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt.toISOString(),
      benefitId: request.benefitId,
      benefitName: request.benefit.categoryName,
      amountSpent: Number(request.amountSpent),
      purchaseChannel: request.purchaseChannel,
      status: request.status,
    })),
  };

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const access = await ensureBrowseHistoryAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  await resetMonthlyBenefitUsage();

  const payload = (await request.json().catch(() => null)) as {
    benefitId?: string;
    amountSpent?: number;
    purchaseChannel?: PurchaseChannel;
    estimatedCashback?: number;
  } | null;

  const benefitId = String(payload?.benefitId ?? '');
  const amountSpent = Number(payload?.amountSpent);
  const purchaseChannel = String(payload?.purchaseChannel ?? '') as PurchaseChannel;
  const estimatedCashback = Math.max(0, Math.round(Number(payload?.estimatedCashback ?? '0')));

  if (!benefitId || Number.isNaN(amountSpent) || !purchaseChannel) {
    return NextResponse.json({ error: 'Benefit, spendings and purchase channel are required' }, { status: 400 });
  }

  await prisma.benefitRequest.create({
    data: {
      userId: access.user.id,
      benefitId,
      amountSpent,
      purchaseChannel,
    },
  });

  const benefit = await prisma.benefit.findUnique({
    where: { id: benefitId },
    select: {
      quotaType: true,
      usageAvailable: true,
      usageUsed: true,
    },
  });

  if (benefit && benefit.usageAvailable !== null) {
    const remaining = Math.max(0, benefit.usageAvailable - benefit.usageUsed);
    if (remaining > 0) {
      const increment = benefit.quotaType === 'COUNT' ? 1 : Math.min(remaining, estimatedCashback);
      if (increment > 0) {
        await prisma.benefit.update({
          where: { id: benefitId },
          data: {
            usageUsed: {
              increment,
            },
          },
        });
      }
    }
  }

  revalidatePath('/history');
  revalidatePath('/browse');

  return NextResponse.json({ ok: true });
}
