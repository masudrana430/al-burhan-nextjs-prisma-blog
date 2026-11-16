import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;

  // Keep each serverless runtime to a single PostgreSQL connection.
  // This is especially important when many Vercel function instances start
  // at the same time and share a database role with a limited connection pool.
  try {
    const url = new URL(connectionString);
    if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }
      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20');
      }
      return url.toString();
    }
  } catch {
    // Let Prisma report malformed or provider-specific connection strings.
  }

  return connectionString;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatabaseUrl(),
    log: ['error'],
  });

// Cache in production too: a warm serverless instance must reuse its client
// rather than opening another pool on module re-evaluation.
globalForPrisma.prisma = prisma;
