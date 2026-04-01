import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ensureOwnerAccessApi } from '@/lib/access-api';

export async function POST(request: Request) {
  const access = await ensureOwnerAccessApi(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  if (process.env.ALLOW_SERVER_VARIABLES?.toLowerCase() !== 'true') {
    return NextResponse.json({ error: 'Server variables are disabled' }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as {
    variables?: Record<string, string>;
  } | null;

  const variables = payload?.variables ?? {};
  if (!variables || typeof variables !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  for (const [key, value] of Object.entries(variables)) {
    if (!key.startsWith('DYNAMIC_')) {
      return NextResponse.json({ error: 'Only DYNAMIC_ variables can be updated' }, { status: 400 });
    }
    process.env[key] = String(value);
  }

  revalidatePath('/manage');

  return NextResponse.json({ ok: true });
}
