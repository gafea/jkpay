'use server';

import { PurchaseChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureBrowseHistoryAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export const createBenefitRequest = async (formData: FormData) => {
  const user = await ensureBrowseHistoryAccess();
  const benefitId = String(formData.get('benefitId') ?? '');
  const amountSpent = Number(formData.get('amountSpent'));
  const purchaseChannel = String(formData.get('purchaseChannel') ?? '') as PurchaseChannel;

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

  revalidatePath('/history');
};
