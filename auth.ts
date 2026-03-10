import NextAuth, { type DefaultSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getAppBaseUrl } from '@/lib/app-url';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
    } & DefaultSession['user'];
  }
}

const requiredEnv = ['OIDC_ISSUER', 'OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'SESSION_SECRET'] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const normalizeMicrosoftIssuer = (issuer: string) => {
  const trimmedIssuer = issuer.trim();
  if (/\/saml2\/?$/i.test(trimmedIssuer)) {
    return trimmedIssuer.replace(/\/saml2\/?$/i, '/v2.0');
  }
  return trimmedIssuer;
};

const microsoftIssuer = normalizeMicrosoftIssuer(process.env.OIDC_ISSUER!);
const appBaseUrl = getAppBaseUrl();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const extractMicrosoftEmail = (profile: Record<string, unknown>) => {
  const emails = Array.isArray(profile.emails) ? profile.emails : [];
  const firstArrayEmail = emails.find((item) => typeof item === 'string');

  const candidates = [
    profile.email,
    profile.preferred_username,
    profile.upn,
    profile.unique_name,
    profile.mail,
    firstArrayEmail,
  ];

  const resolved = candidates.find((value) => typeof value === 'string' && value.trim() !== '');
  return resolved ? normalizeEmail(String(resolved)) : null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  secret: process.env.SESSION_SECRET,
  providers: [
    {
      id: 'microsoft',
      name: 'Microsoft',
      type: 'oidc',
      issuer: microsoftIssuer,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
      profile(profile) {
        const email = extractMicrosoftEmail(profile as Record<string, unknown>);

        if (!email) {
          throw new Error('No email claim found in Microsoft profile.');
        }

        return {
          id: String(profile.sub),
          name: profile.name ?? email,
          email,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async jwt({ token, user }) {
      if (!token.email && user?.email) {
        token.email = normalizeEmail(user.email);
      }

      if (token.email) {
        const normalizedEmail = normalizeEmail(String(token.email));
        token.email = normalizedEmail;

        try {
          const dbUser = await prisma.user.upsert({
            where: { email: normalizedEmail },
            update: {
              name: user?.name ?? undefined,
            },
            create: {
              email: normalizedEmail,
              name: user?.name ?? null,
            },
            select: { id: true, email: true },
          });

          token.sub = dbUser.id;
          token.email = dbUser.email;
        } catch {
          if (!token.sub) {
            token.sub = normalizedEmail;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && token.email) {
        session.user.id = String(token.sub);
        session.user.email = String(token.email);
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      const canonicalBase = appBaseUrl.toString();

      if (url.startsWith('/')) {
        return new URL(url, canonicalBase).toString();
      }

      try {
        const target = new URL(url);
        const inferredBase = new URL(baseUrl);

        if (target.origin === inferredBase.origin) {
          return new URL(`${target.pathname}${target.search}${target.hash}`, canonicalBase).toString();
        }

        if (target.origin === appBaseUrl.origin) {
          return target.toString();
        }
      } catch {
        return canonicalBase;
      }

      return canonicalBase;
    },
  },
  pages: {
    signIn: '/',
  },
});
