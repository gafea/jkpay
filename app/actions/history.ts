'use server';

import { PurchaseChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureBrowseHistoryAccess } from '@/lib/access';
import { resetMonthlyBenefitUsage } from '@/lib/benefits';
import { prisma } from '@/lib/prisma';

export const createBenefitRequest = async (formData: FormData) => {
  const user = await ensureBrowseHistoryAccess();
  await resetMonthlyBenefitUsage();
  const benefitId = String(formData.get('benefitId') ?? '');
  const amountSpent = Number(formData.get('amountSpent'));
  const purchaseChannel = String(formData.get('purchaseChannel') ?? '') as PurchaseChannel;
  const estimatedCashback = Math.max(0, Math.round(Number(formData.get('estimatedCashback') ?? '0')));

  if (!benefitId || Number.isNaN(amountSpent) || !purchaseChannel) {
    throw new Error('Benefit, amount spent and purchase channel are required');
  }

  await prisma.benefitRequest.create({
    data: {
      userId: user.id,
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
};
