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
    const topicId = searchParams.get('topicId') || '';
    const difficulty = searchParams.get('difficulty') as Difficulty | null;
    const tag = searchParams.get('tag') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(20, Math.max(1, Number(searchParams.get('pageSize') || 4)));

    const where: Prisma.PostWhereInput = {
      published: true,
      ...(category ? { category } : {}),
      ...(topicId ? { topicId } : {}),
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
        include: { topic: true },
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

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
}

function makeSlug(value: string) {
  return value.toLowerCase().normalize('NFKC').trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 110);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 401 });
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (title.length < 3 || title.length > 220 || !content) {
      return NextResponse.json({ error: 'শিরোনাম ও মূল লেখা আবশ্যক।' }, { status: 400 });
    }
    const baseSlug = makeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : title) || 'article';
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    const topicId = typeof body.topicId === 'string' && body.topicId ? body.topicId : undefined;
    if (topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, isActive: true } });
      if (!topic?.isActive) return NextResponse.json({ error: 'নির্বাচিত বিষয়টি পাওয়া যায়নি।' }, { status: 400 });
    }
    const post = await prisma.post.create({
      data: {
        title, slug,
        claimAddressed: typeof body.claimAddressed === 'string' ? body.claimAddressed : '',
        excerpt: typeof body.excerpt === 'string' && body.excerpt.trim() ? body.excerpt.trim() : content.slice(0, 240),
        content,
        blocks: Array.isArray(body.blocks) ? body.blocks : undefined,
        category: Object.values(Category).includes(body.category) ? body.category : 'PHILOSOPHY_LOGIC',
        topicId,
        difficulty: Object.values(Difficulty).includes(body.difficulty) ? body.difficulty : 'INTERMEDIATE',
        tags: Array.isArray(body.tags) ? body.tags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 20) : [],
        keyTakeaways: Array.isArray(body.keyTakeaways) ? body.keyTakeaways.filter((item: unknown): item is string => typeof item === 'string').slice(0, 20) : [],
        references: Array.isArray(body.references) ? body.references : [],
        readTimeMinutes: Math.max(1, Math.min(120, Number(body.readTimeMinutes) || 5)),
        featured: body.featured === true,
        published: body.published !== false,
        authorName: session?.user?.name || 'আল-বুরহান সম্পাদক',
        authorId: session?.user?.id || undefined,
      },
      include: { topic: true },
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/posts]', error);
    return NextResponse.json({ error: 'পোস্ট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 401 });
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'পোস্ট আইডি প্রয়োজন।' }, { status: 400 });
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/posts]', error);
    return NextResponse.json({ error: 'পোস্ট মুছে ফেলা যায়নি।' }, { status: 500 });
  }
}
