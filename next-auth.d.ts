import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'READER';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'ADMIN' | 'READER';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'READER';
  }
}
