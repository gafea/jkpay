import { auth, signIn } from '@/auth';
import { getAppBaseUrl } from '@/lib/app-url';
import { getFriendAccessStatus, isOwnerEmail } from '@/lib/access';
import { redirect } from 'next/navigation';

type HomePageProps = {
  searchParams?: Promise<{
    autoredirect?: string;
    callbackUrl?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const session = await auth();
  const appBaseUrl = getAppBaseUrl().toString();
  const appOrigin = new URL(appBaseUrl).origin;
  const fallbackCallbackUrl = new URL('/browse', appBaseUrl).toString();
  let callbackUrl = fallbackCallbackUrl;
  let accessStatus: 'active' | 'disabled' | 'expired' | 'none' = 'none';

  if (resolvedSearchParams.callbackUrl) {
    try {
      const candidate = new URL(resolvedSearchParams.callbackUrl, appBaseUrl);
      if (candidate.origin === appOrigin) {
        callbackUrl = candidate.toString();
      }
    } catch {
      callbackUrl = fallbackCallbackUrl;
    }
  }

  if (resolvedSearchParams.autoredirect === '1') {
    if (session?.user?.email) {
      redirect(callbackUrl);
    }

    const signInUrl = new URL('/api/auth/signin', appBaseUrl);
    signInUrl.searchParams.set('provider', 'microsoft');
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    redirect(signInUrl.toString());
  }

  if (session?.user?.email) {
    const email = session.user.email.toLowerCase();

    if (isOwnerEmail(email)) {
      redirect('/manage');
    }

    accessStatus = await getFriendAccessStatus(email);
    if (accessStatus === 'active') {
      redirect('/browse');
    }
  }

  return (
    <main className="mx-auto mt-10 max-w-3xl px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold text-slate-900">Welcome to jkPay</h1>
        {!session?.user?.email ? (
          <form
            action={async () => {
              'use server';
              await signIn('microsoft', {
                redirectTo: fallbackCallbackUrl,
              });
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Sign in with Microsoft
            </button>
          </form>
        ) : (
          <div className="grid gap-2 text-sm text-slate-700">
            {accessStatus === 'disabled' && <p>Your account has been disabled.</p>}
            {accessStatus === 'expired' && <p>Your account has been expired.</p>}
            {accessStatus === 'none' && <p>You've signed in, but it seems that you have not been invited yet.</p>}
            <p>Email: {session.user.email}</p>
            <form
              action={async () => {
                'use server';
                await signIn(
                  'microsoft',
                  { redirectTo: new URL('/', appBaseUrl).toString() },
                  { prompt: 'select_account' },
                );
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Sign in with Microsoft (switch account)
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
