import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

function adminPasswordMatches(candidate: string, configured: string): boolean {
  const left = createHash('sha256').update(candidate, 'utf8').digest();
  const right = createHash('sha256').update(configured, 'utf8').digest();
  return timingSafeEqual(left, right);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8, updateAge: 15 * 60 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Administrator',
      credentials: {
        email: { label: 'Administrator email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const configuredPassword = process.env.ADMIN_PASSWORD;
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!configuredEmail || !configuredPassword || !email || !password) return null;
        if (email !== configuredEmail || !adminPasswordMatches(password, configuredPassword)) return null;
        return { id: `admin:${configuredEmail}`, name: 'Masud Rana', email: configuredEmail, role: 'ADMIN' };
      },
    }),
    CredentialsProvider({
      id: 'user-credentials',
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.role !== 'READER') return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;
      const googleProfile = profile as { email_verified?: boolean } | undefined;
      const email = user.email?.trim().toLowerCase();
      if (!email || googleProfile?.email_verified !== true) return false;
      try {
        await prisma.user.upsert({
          where: { email },
          update: {
            googleId: account.providerAccountId,
            image: user.image || undefined,
            name: user.name || 'AL-BURHAN Reader',
          },
          create: {
            email,
            googleId: account.providerAccountId,
            name: user.name || 'AL-BURHAN Reader',
            image: user.image,
            role: 'READER',
          },
        });
        return true;
      } catch (error) {
        console.error('[auth] Google account linking failed:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider !== 'google') {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: 'ADMIN' | 'READER' }).role || 'READER';
      }
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
        session.user.role = (token.role as 'ADMIN' | 'READER') || 'READER';
      }
      return session;
    },
  },
};
