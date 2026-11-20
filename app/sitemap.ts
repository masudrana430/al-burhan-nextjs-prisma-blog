import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  return [
    { url: siteUrl + '/', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: siteUrl + '/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...posts.map((post) => ({
      url: siteUrl + '/articles/' + encodeURIComponent(post.slug),
      lastModified: post.updatedAt || post.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
