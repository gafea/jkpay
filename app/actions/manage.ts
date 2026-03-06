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

const toInt = (value: FormDataEntryValue | null) => {
  if (!value || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('Invalid integer input');
  }
  return parsed;
};

export const saveFriend = async (formData: FormData) => {
  const owner = await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('Friend email is required');
  }

  const friendUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  let recordId = id;
  if (id) {
    await prisma.friendAccess.update({
      where: { id },
      data: {
        friendId: friendUser.id,
        monthlyLimit: toDecimal(formData.get('monthlyLimit')),
        activeUntil: toDate(formData.get('activeUntil')),
        isDisabled: false,
      },
    });
  } else {
    const created = await prisma.friendAccess.upsert({
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
    recordId = created.id;
  }

  revalidatePath('/manage');
  return { id: recordId };
};

export const addFriend = saveFriend;

export const removeFriend = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.friendAccess.delete({ where: { id } });
  revalidatePath('/manage');
};

export const saveCard = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const expiryDate = toDate(formData.get('expiryDate'));
  const monthlyLimit = toDecimal(formData.get('monthlyLimit'));

  if (!name) {
    throw new Error('Card name is required');
  }

  let recordId = id;
  if (id) {
    await prisma.card.update({
      where: { id },
      data: {
        name,
        expiryDate,
        monthlyLimit,
      },
    });
  } else {
    const created = await prisma.card.create({
      data: {
        name,
        expiryDate,
        monthlyLimit,
      },
    });
    recordId = created.id;
  }

  revalidatePath('/manage');
  return { id: recordId };
};

export const addCard = saveCard;

export const removeCard = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.card.delete({ where: { id } });
  revalidatePath('/manage');
};

export const saveBenefit = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '').trim();
  const categoryName = String(formData.get('categoryName') ?? '').trim();
  const expiryDate = toDate(formData.get('expiryDate'));
  const cashbackType = String(formData.get('cashbackType') ?? '') as CashbackType;
  const cashbackAmount = toDecimal(formData.get('cashbackAmount'));
  const usageAvailable = toInt(formData.get('usageAvailable'));
  const minimumSpending = toDecimal(formData.get('minimumSpending'));
  const maximumSpending = toDecimal(formData.get('maximumSpending'));
  const applicableWeekdays = formData
    .getAll('applicableWeekdays')
    .map((value) => String(value) as Weekday);
  const purchaseChannels = formData
    .getAll('purchaseChannels')
    .map((value) => String(value) as PurchaseChannel);
  const linkedCardIds = formData.getAll('linkedCardIds').map((value) => String(value));

  if (!categoryName || !cashbackType || cashbackAmount === null) {
    throw new Error('Category name, type and cashback amount are required');
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
        usageAvailable,
        minimumSpending,
        maximumSpending,
        applicableWeekdays,
        purchaseChannels,
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
        usageAvailable,
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
    recordId = created.id;
  }

  revalidatePath('/manage');
  return { id: recordId };
};

export const addBenefit = saveBenefit;

export const removeBenefit = async (formData: FormData) => {
  await ensureOwnerAccess();
  const id = String(formData.get('id') ?? '');
  await prisma.benefit.delete({ where: { id } });
  revalidatePath('/manage');
};
