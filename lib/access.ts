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
  const status = await getFriendAccessStatus(email);
  return status === 'active';
};

export const getFriendAccessStatus = async (email: string): Promise<'active' | 'disabled' | 'expired' | 'none'> => {
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      friendOf: {
        select: {
          isDisabled: true,
          activeUntil: true,
        },
      },
    },
  });

  if (!user || user.friendOf.length === 0) {
    return 'none';
  }

  const hasActive = user.friendOf.some(
    (friendAccess) => !friendAccess.isDisabled && (!friendAccess.activeUntil || friendAccess.activeUntil >= now),
  );
  if (hasActive) {
    return 'active';
  }

  const hasDisabled = user.friendOf.some((friendAccess) => friendAccess.isDisabled);
  if (hasDisabled) {
    return 'disabled';
  }

  const hasExpired = user.friendOf.some((friendAccess) =>
    Boolean(friendAccess.activeUntil && friendAccess.activeUntil < now),
  );
  if (hasExpired) {
    return 'expired';
  }

  return 'none';
};

export const ensureBrowseHistoryAccess = async () => {
  const user = await getCurrentSessionUser();

  if (isOwnerEmail(user.email)) {
    return user;
  }

  const status = await getFriendAccessStatus(user.email);
  if (status !== 'active') {
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
