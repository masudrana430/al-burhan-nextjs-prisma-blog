import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

function passwordMatches(candidate: string, configuredPassword: string): boolean {
  // Hash both values to fixed-length digests before constant-time comparison.
  const candidateDigest = createHash('sha256').update(candidate, 'utf8').digest();
  const configuredDigest = createHash('sha256').update(configuredPassword, 'utf8').digest();
  return timingSafeEqual(candidateDigest, configuredDigest);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
    updateAge: 15 * 60,
  },
  providers: [
    CredentialsProvider({
      name: 'Administrator',
      credentials: {
        email: { label: 'Administrator email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const configuredPassword = process.env.ADMIN_PASSWORD;

        // Fail closed until both credentials have been configured in Vercel.
        if (!configuredEmail || !configuredPassword) {
          console.error('[auth] ADMIN_EMAIL and ADMIN_PASSWORD must be configured.');
          return null;
        }

        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password || email !== configuredEmail) {
          return null;
        }

        if (!passwordMatches(password, configuredPassword)) {
          return null;
        }

        return {
          id: `admin:${configuredEmail}`,
          name: 'Masud Rana',
          email: configuredEmail,
          role: 'ADMIN',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as typeof user & { role?: 'ADMIN' | 'READER' }).role || 'READER';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string; role?: 'ADMIN' | 'READER' }).id =
          token.sub || '';
        (session.user as typeof session.user & { id?: string; role?: 'ADMIN' | 'READER' }).role =
          (token.role as 'ADMIN' | 'READER') || 'READER';
      }
      return session;
    },
  },
};
