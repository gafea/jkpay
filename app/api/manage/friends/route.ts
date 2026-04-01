import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ensureOwnerAccessApi } from '@/lib/access-api';
import { prisma } from '@/lib/prisma';
import { parseBoolean, parseOptionalDate, parseString } from '@/lib/manage-input';

export async function POST(request: Request) {
  const access = await ensureOwnerAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    email?: string;
    nickname?: string;
    fcmToken?: string;
    activeUntil?: string;
    isDisabled?: boolean;
  } | null;

  const id = parseString(payload?.id ?? '');
  const email = parseString(payload?.email ?? '').toLowerCase();
  const nickname = parseString(payload?.nickname ?? '');
  const fcmToken = parseString(payload?.fcmToken ?? '');
  const activeUntil = parseOptionalDate(payload?.activeUntil ?? '');
  const isDisabled = parseBoolean(payload?.isDisabled);

  if (!email) {
    return NextResponse.json({ error: 'Friend email is required' }, { status: 400 });
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
        nickname: nickname || null,
        fcmToken: fcmToken || null,
        activeUntil,
        isDisabled,
      },
    });
  } else {
    const created = await prisma.friendAccess.upsert({
      where: {
        ownerId_friendId: {
          ownerId: access.user.id,
          friendId: friendUser.id,
        },
      },
      update: {
        nickname: nickname || null,
        fcmToken: fcmToken || null,
        activeUntil,
        isDisabled,
      },
      create: {
        ownerId: access.user.id,
        friendId: friendUser.id,
        nickname: nickname || null,
        fcmToken: fcmToken || null,
        activeUntil,
        isDisabled,
      },
    });
    recordId = created.id;
  }

  revalidatePath('/manage');
  revalidatePath('/browse');

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
    return NextResponse.json({ error: 'Friend id is required' }, { status: 400 });
  }

  await prisma.friendAccess.delete({ where: { id } });

  revalidatePath('/manage');
  revalidatePath('/browse');

  return NextResponse.json({ ok: true });
}
