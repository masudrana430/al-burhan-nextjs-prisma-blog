import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = (session as { user?: { role?: string } } | null)?.user;
  return user?.role === 'ADMIN';
}

function makeSlug(value: string) {
  return value.toLowerCase().normalize('NFKC').trim()
    .replace(/[^\\p{L}\\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 90);
}

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('[GET /api/topics]', error);
    return NextResponse.json({ error: 'বিষয়গুলোর তালিকা আনা যায়নি। ডেটাবেস সংযোগ পরীক্ষা করুন।' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'সেশন শেষ হয়েছে অথবা প্রশাসকের অনুমতি নেই। আবার লগইন করুন।' }, { status: 403 });
    }

    let body: { name?: unknown; description?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'সঠিক তথ্য পাঠানো হয়নি। আবার চেষ্টা করুন।' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\\s+/gu, ' ') : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'বিষয়ের নাম ২ থেকে ৬০ অক্ষরের মধ্যে হতে হবে।' }, { status: 400 });
    }

    const existing = await prisma.topic.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'এই নামের বিষয় আগে থেকেই ডেটাবেসে আছে।' }, { status: 409 });
    }

    const base = makeSlug(name) || 'topic';
    const topic = await prisma.topic.create({
      data: {
        name,
        slug: `${base}-${randomUUID()}`,
        description: description || null,
        isActive: true,
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({
      topic: { ...topic, description: topic.description || '', postCount: topic._count.posts },
      success: true,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/topics] Failed to create topic:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'এই বিষয়টি আগে থেকেই আছে। অন্য নাম ব্যবহার করুন।' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: 'ডেটাবেসে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।' }, { status: 503 });
    }
    return NextResponse.json({ error: 'ডেটাবেসে বিষয়টি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'বিষয় আইডি প্রয়োজন।' }, { status: 400 });
    const topic = await prisma.topic.findUnique({ where: { id }, include: { _count: { select: { posts: true } } } });
    if (!topic) return NextResponse.json({ error: 'বিষয়টি পাওয়া যায়নি।' }, { status: 404 });
    if (topic._count.posts > 0) {
      return NextResponse.json({ error: 'এই বিষয়ে পোস্ট আছে। আগে পোস্টগুলো অন্য বিষয়ে সরান।' }, { status: 409 });
    }
    await prisma.topic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/topics]', error);
    return NextResponse.json({ error: 'বিষয় মুছে ফেলা যায়নি।' }, { status: 500 });
  }
}
