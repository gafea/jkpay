import { NextResponse } from 'next/server';
import { getCurrentSessionUserApi } from '@/lib/access-api';

export async function GET(request: Request) {
  const user = await getCurrentSessionUserApi(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? '',
    },
  });
}
