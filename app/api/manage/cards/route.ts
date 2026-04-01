import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ensureOwnerAccessApi } from '@/lib/access-api';
import { prisma } from '@/lib/prisma';
import { parseBoolean, parseOptionalNumber, parseString } from '@/lib/manage-input';

export async function POST(request: Request) {
  const access = await ensureOwnerAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    fcyFee?: string | number | null;
    isCredit?: boolean;
    isDisabled?: boolean;
  } | null;

  const id = parseString(payload?.id ?? '');
  const name = parseString(payload?.name ?? '');
  const fcyFee = parseOptionalNumber(payload?.fcyFee ?? '');
  const isCredit = parseBoolean(payload?.isCredit);
  const isDisabled = parseBoolean(payload?.isDisabled);

  if (!name) {
    return NextResponse.json({ error: 'Card name is required' }, { status: 400 });
  }

  let recordId = id;
  if (id) {
    await prisma.card.update({
      where: { id },
      data: {
        name,
        fcyFee,
        isCredit,
        isDisabled,
      },
    });
  } else {
    const created = await prisma.card.create({
      data: {
        name,
        fcyFee,
        isCredit,
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
    return NextResponse.json({ error: 'Card id is required' }, { status: 400 });
  }

  await prisma.card.delete({ where: { id } });

  revalidatePath('/manage');
  revalidatePath('/browse');

  return NextResponse.json({ ok: true });
}
