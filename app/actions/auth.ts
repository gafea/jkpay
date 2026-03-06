'use server';

import { signIn } from '@/auth';
import { getAppBaseUrl } from '@/lib/app-url';

export async function reauthenticate() {
  const appBaseUrl = getAppBaseUrl().toString();
  await signIn(
    'microsoft',
    { redirectTo: new URL('/', appBaseUrl).toString() },
    { prompt: 'select_account' }
  );
}
