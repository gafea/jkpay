import { prisma } from '@/lib/prisma';
import { getFriendAccessStatus, isOwnerEmail } from '@/lib/access';
import { getToken } from 'next-auth/jwt';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

type ApiUser = {
  id: string;
  email: string;
  name: string;
};

export type ApiAccessResult = { ok: true; user: ApiUser } | { ok: false; status: number; reason: string };

type AuthIdentity = {
  email: string;
  name: string;
};

const resolveRequestProto = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim().toLowerCase() ?? '';
  }

  try {
    return new URL(request.url).protocol.replace(':', '').toLowerCase();
  } catch {
    return '';
  }
};

const resolveAuthIdentity = async (request: Request): Promise<AuthIdentity | null> => {
  const secureCookie = resolveRequestProto(request) === 'https';
  const token = await getToken({ req: request, secret: process.env.SESSION_SECRET!, secureCookie });
  if (!token?.email) {
    return null;
  }

  return {
    email: String(token.email),
    name: token.name ? String(token.name) : '',
  };
};

export const getCurrentSessionUserApi = async (request: Request): Promise<ApiUser | null> => {
  const identity = await resolveAuthIdentity(request);

  if (!identity?.email) {
    return null;
  }

  const normalizedEmail = normalizeEmail(identity.email);

  const normalizedName = identity.name.trim();
  const dbUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: normalizedName || undefined,
    },
    create: {
      email: normalizedEmail,
      name: normalizedName || null,
    },
    select: { id: true },
  });

  return {
    id: dbUser.id,
    email: normalizedEmail,
    name: normalizedName,
  };
};

export const ensureBrowseHistoryAccessApi = async (request: Request): Promise<ApiAccessResult> => {
  const user = await getCurrentSessionUserApi(request);
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

export const ensureOwnerAccessApi = async (request: Request): Promise<ApiAccessResult> => {
  const user = await getCurrentSessionUserApi(request);
  if (!user) {
    return { ok: false, status: 401, reason: 'Unauthorized' };
  }

  if (!isOwnerEmail(user.email)) {
    return { ok: false, status: 403, reason: 'Forbidden' };
  }

  return { ok: true, user };
};
