import { auth, signIn } from '@/auth';
import { getAppBaseUrl } from '@/lib/app-url';
import { hasFriendAccess, isOwnerEmail } from '@/lib/access';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();
  const appBaseUrl = getAppBaseUrl().toString();

  if (session?.user?.email) {
    const email = session.user.email.toLowerCase();

    if (isOwnerEmail(email)) {
      redirect('/manage');
    }

    const canAccessBrowse = await hasFriendAccess(email);
    if (canAccessBrowse) {
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
                redirectTo: new URL('/browse', appBaseUrl).toString(),
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
            <p>Your account is signed in but does not currently have dashboard access.</p>
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
                Switch account
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
