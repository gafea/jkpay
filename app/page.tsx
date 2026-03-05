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
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <div className="card">
        <h1>Welcome to jkPay</h1>
        {!session?.user?.email ? (
          <form
            action={async () => {
              'use server';
              await signIn('microsoft', {
                redirectTo: new URL('/browse', appBaseUrl).toString(),
              });
            }}
          >
            <button type="submit">Sign in with Microsoft</button>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
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
              <button type="submit">Switch account</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
