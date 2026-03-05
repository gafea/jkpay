import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isOwnerEmail = (email: string) => {
  const owner = process.env.OWNER;
  if (!owner) {
    throw new Error('Missing OWNER environment variable');
  }
  return normalizeEmail(email) === normalizeEmail(owner);
};

export const getCurrentSessionUser = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/api/auth/signin/microsoft');
  }

  const normalizedEmail = normalizeEmail(session.user.email);

  const dbUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: session.user.name ?? null,
    },
    create: {
      email: normalizedEmail,
      name: session.user.name ?? null,
    },
    select: { id: true },
  });

  return {
    id: dbUser.id,
    email: normalizedEmail,
    name: session.user.name ?? '',
  };
};

export const hasFriendAccess = async (email: string) => {
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      friendOf: {
        where: {
          isDisabled: false,
          OR: [{ activeUntil: null }, { activeUntil: { gte: now } }],
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  return Boolean(user?.friendOf.length);
};

export const ensureBrowseHistoryAccess = async () => {
  const user = await getCurrentSessionUser();

  if (isOwnerEmail(user.email)) {
    return user;
  }

  const canAccess = await hasFriendAccess(user.email);
  if (!canAccess) {
    redirect('/');
  }

  return user;
};

export const ensureOwnerAccess = async () => {
  const user = await getCurrentSessionUser();

  if (!isOwnerEmail(user.email)) {
    redirect('/browse');
  }

  return user;
};
