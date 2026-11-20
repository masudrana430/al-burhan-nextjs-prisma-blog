import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ({ role?: string } | undefined);
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const source = await prisma.quranTafsirSource.findUnique({
      where: { slug: 'bn-tafsir-abu-bakr-zakaria' },
      select: {
        slug: true,
        title: true,
        author: true,
        language: true,
        resourceId: true,
        sourceUrl: true,
        sourceVersion: true,
        importedGroups: true,
        coveredAyahs: true,
        datasetSha256: true,
        isActive: true,
        licenseReviewedAt: true,
        importedAt: true,
        _count: { select: { passages: true } },
      },
    });

    return NextResponse.json({
      configured: Boolean(source?.isActive),
      source: source ? {
        slug: source.slug,
        title: source.title,
        author: source.author,
        language: source.language,
        resourceId: source.resourceId,
        sourceUrl: source.sourceUrl,
        sourceVersion: source.sourceVersion,
        importedGroups: source.importedGroups,
        coveredAyahs: source.coveredAyahs,
        datasetSha256: source.datasetSha256,
        isActive: source.isActive,
        licenseReviewedAt: source.licenseReviewedAt?.toISOString() ?? null,
        importedAt: source.importedAt?.toISOString() ?? null,
        storedPassages: source._count.passages,
      } : null,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('[QUL Tafsir status] Failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'Tafsir database status could not be loaded.' }, { status: 500 });
  }
}
