import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Category, Difficulty } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category') as Category | null;
    const difficulty = searchParams.get('difficulty') as Difficulty | null;
    const tag = searchParams.get('tag') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(20, Math.max(1, Number(searchParams.get('pageSize') || 4)));

    const where: Prisma.PostWhereInput = {
      published: true,
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { claimAddressed: { contains: q, mode: 'insensitive' } },
              { excerpt: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
              { tags: { hasSome: q.split(/\s+/) } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sortBy === 'popular'
        ? { views: 'desc' }
        : sortBy === 'readTime'
        ? { readTimeMinutes: 'asc' }
        : { createdAt: 'desc' };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[GET /api/posts]', error);
    return NextResponse.json({ error: 'Failed to query blog posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as (typeof session.user & { role?: string }) | undefined;

    if (sessionUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug: body.slug,
        claimAddressed: body.claimAddressed,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        difficulty: body.difficulty,
        tags: body.tags,
        keyTakeaways: body.keyTakeaways,
        references: body.references,
        readTimeMinutes: body.readTimeMinutes || 6,
      },
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 400 });
  }
}
