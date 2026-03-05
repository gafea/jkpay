'use server';

import { CashbackType, PurchaseChannel, Weekday } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureOwnerAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

const toDecimal = (value: FormDataEntryValue | null) => {
  if (!value || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid numeric input');
  }
  return parsed;
};

const toDate = (value: FormDataEntryValue | null) => {
  if (!value || String(value).trim() === '') {
    return null;
  }
  return new Date(String(value));
};

export const addFriend = async (formData: FormData) => {
  const owner = await ensureOwnerAccess();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('Friend email is required');
  }

  const friendUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  await prisma.friendAccess.upsert({
    where: {
      ownerId_friendId: {
        ownerId: owner.id,
        friendId: friendUser.id,
      },
    },
    update: {
      monthlyLimit: toDecimal(formData.get('monthlyLimit')),
      activeUntil: toDate(formData.get('activeUntil')),
      isDisabled: false,
    },
    create: {
      ownerId: owner.id,
      friendId: friendUser.id,
      monthlyLimit: toDecimal(formData.get('monthlyLimit')),
      activeUntil: toDate(formData.get('activeUntil')),
    },
  });

  revalidatePath('/manage');
};

export const removeFriend = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.friendAccess.delete({ where: { id } });
  revalidatePath('/manage');
};

export const addCard = async (formData: FormData) => {
  await ensureOwnerAccess();
  const name = String(formData.get('name') ?? '').trim();
  const expiryDate = toDate(formData.get('expiryDate'));
  const monthlyLimit = toDecimal(formData.get('monthlyLimit'));

  if (!name || !expiryDate || monthlyLimit === null) {
    throw new Error('Card name, expiry date and monthly limit are required');
  }

  await prisma.card.create({
    data: {
      name,
      expiryDate,
      monthlyLimit,
    },
  });

  revalidatePath('/manage');
};

export const removeCard = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.card.delete({ where: { id } });
  revalidatePath('/manage');
};

export const addBenefit = async (formData: FormData) => {
  await ensureOwnerAccess();
  const categoryName = String(formData.get('categoryName') ?? '').trim();
  const expiryDate = toDate(formData.get('expiryDate'));
  const cashbackType = String(formData.get('cashbackType') ?? '') as CashbackType;
  const cashbackAmount = toDecimal(formData.get('cashbackAmount'));
  const usageAvailable = formData.get('usageAvailable')
    ? Number(formData.get('usageAvailable'))
    : null;
  const minimumSpending = toDecimal(formData.get('minimumSpending'));
  const maximumSpending = toDecimal(formData.get('maximumSpending'));
  const applicableWeekdays = formData
    .getAll('applicableWeekdays')
    .map((value) => String(value) as Weekday);
  const purchaseChannels = formData
    .getAll('purchaseChannels')
    .map((value) => String(value) as PurchaseChannel);
  const linkedCardIds = formData.getAll('linkedCardIds').map((value) => String(value));

  if (!categoryName || !expiryDate || !cashbackType || cashbackAmount === null) {
    throw new Error('Required benefit fields are missing');
  }

  if (!linkedCardIds.length) {
    throw new Error('At least one linked card is required');
  }

  await prisma.benefit.create({
    data: {
      categoryName,
      expiryDate,
      cashbackType,
      cashbackAmount,
      usageAvailable: Number.isNaN(usageAvailable) ? null : usageAvailable,
      minimumSpending,
      maximumSpending,
      applicableWeekdays,
      purchaseChannels,
      cardLinks: {
        createMany: {
          data: linkedCardIds.map((cardId) => ({ cardId })),
        },
      },
    },
  });

  revalidatePath('/manage');
};

export const removeBenefit = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.benefit.delete({ where: { id } });
  revalidatePath('/manage');
};

export const toggleBenefit = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  const isEnabled = String(formData.get('isEnabled') ?? '') === 'true';
  await prisma.benefit.update({
    where: { id },
    data: { isEnabled: !isEnabled },
  });
  revalidatePath('/manage');
  revalidatePath('/browse');
};
