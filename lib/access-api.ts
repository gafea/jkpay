import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getFriendAccessStatus, isOwnerEmail } from '@/lib/access';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

type ApiUser = {
  id: string;
  email: string;
  name: string;
};

export type ApiAccessResult = { ok: true; user: ApiUser } | { ok: false; status: number; reason: string };

const getCurrentSessionUserApi = async (): Promise<ApiUser | null> => {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
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

export const ensureBrowseHistoryAccessApi = async (): Promise<ApiAccessResult> => {
  const user = await getCurrentSessionUserApi();
  if (!user) {
    return { ok: false, status: 401, reason: 'Unauthorized' };
  }

  if (isOwnerEmail(user.email)) {
    return { ok: true, user };
  }

  const status = await getFriendAccessStatus(user.email);
  if (status !== 'active') {
    return { ok: false, status: 403, reason: 'Forbidden' };
  }

  return { ok: true, user };
};

export const ensureOwnerAccessApi = async (): Promise<ApiAccessResult> => {
  const user = await getCurrentSessionUserApi();
  if (!user) {
    return { ok: false, status: 401, reason: 'Unauthorized' };
  }

  if (!isOwnerEmail(user.email)) {
    return { ok: false, status: 403, reason: 'Forbidden' };
  }

  return { ok: true, user };
};
