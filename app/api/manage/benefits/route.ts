import { NextResponse } from 'next/server';
import type { CashbackType, PurchaseChannel, QuotaType, Weekday } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureOwnerAccessApi } from '@/lib/access-api';
import { prisma } from '@/lib/prisma';
import {
  parseBoolean,
  parseOptionalDate,
  parseOptionalInt,
  parseOptionalNumber,
  parseString,
} from '@/lib/manage-input';

export async function POST(request: Request) {
  const access = await ensureOwnerAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    categoryName?: string;
    expiryDate?: string;
    cashbackType?: CashbackType;
    cashbackAmount?: number | string;
    quotaType?: QuotaType;
    usageAvailable?: number | string | null;
    quotaResetsMonthly?: boolean;
    minimumSpending?: number | string | null;
    maximumSpending?: number | string | null;
    applicableWeekdays?: Weekday[];
    purchaseChannel?: PurchaseChannel | '';
    linkedCardIds?: string[];
  } | null;

  const id = parseString(payload?.id ?? '');
  const categoryName = parseString(payload?.categoryName ?? '');
  const expiryDate = parseOptionalDate(payload?.expiryDate ?? '');
  const cashbackType = String(payload?.cashbackType ?? '') as CashbackType;
  const cashbackAmount = parseOptionalNumber(payload?.cashbackAmount ?? '');
  const quotaType = (String(payload?.quotaType ?? 'CAP') as QuotaType) || 'CAP';
  const usageAvailable = parseOptionalInt(payload?.usageAvailable ?? '');
  const quotaResetsMonthly = parseBoolean(payload?.quotaResetsMonthly);
  const minimumSpending = parseOptionalNumber(payload?.minimumSpending ?? '');
  const maximumSpending = parseOptionalNumber(payload?.maximumSpending ?? '');
  const applicableWeekdays = Array.isArray(payload?.applicableWeekdays)
    ? payload?.applicableWeekdays.map((value) => String(value) as Weekday)
    : [];
  const purchaseChannelValue = parseString(payload?.purchaseChannel ?? '');
  const purchaseChannel = purchaseChannelValue ? (purchaseChannelValue as PurchaseChannel) : null;
  const linkedCardIds = Array.isArray(payload?.linkedCardIds)
    ? payload?.linkedCardIds.map((value) => String(value))
    : [];

  if (!categoryName || !cashbackType || cashbackAmount === null) {
    return NextResponse.json({ error: 'Category name, type and cashback amount are required' }, { status: 400 });
  }

  let recordId = id;
  if (id) {
    await prisma.benefit.update({
      where: { id },
      data: {
        categoryName,
        expiryDate,
        cashbackType,
        cashbackAmount,
        quotaType,
        usageAvailable,
        quotaResetsMonthly,
        minimumSpending,
        maximumSpending,
        applicableWeekdays,
        purchaseChannel,
        cardLinks: {
          deleteMany: {},
          createMany: {
            data: linkedCardIds.map((cardId) => ({ cardId })),
          },
        },
      },
    });
  } else {
    const created = await prisma.benefit.create({
      data: {
        categoryName,
        expiryDate,
        cashbackType,
        cashbackAmount,
        quotaType,
        usageAvailable,
        quotaResetsMonthly,
        minimumSpending,
        maximumSpending,
        applicableWeekdays,
        purchaseChannel,
        cardLinks: {
          createMany: {
            data: linkedCardIds.map((cardId) => ({ cardId })),
          },
        },
      },
    });
    recordId = created.id;
  }

  revalidatePath('/manage');

  return NextResponse.json({ id: recordId });
}

export async function DELETE(request: Request) {
  const access = await ensureOwnerAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  const payload = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = parseString(payload?.id ?? '');
  if (!id) {
    return NextResponse.json({ error: 'Benefit id is required' }, { status: 400 });
  }

  const requestCount = await prisma.benefitRequest.count({ where: { benefitId: id } });

  if (requestCount > 0) {
    const archivedDate = new Date();
    archivedDate.setHours(0, 0, 0, 0);
    archivedDate.setDate(archivedDate.getDate() - 1);

    await prisma.benefit.update({
      where: { id },
      data: {
        expiryDate: archivedDate,
      },
    });
  } else {
    await prisma.benefit.delete({ where: { id } });
  }

  revalidatePath('/manage');
  revalidatePath('/browse');
  revalidatePath('/history');

  return NextResponse.json({ ok: true });
}
