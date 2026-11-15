import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
}

function makeSlug(value: string) {
  return value.toLowerCase().normalize('NFKC').trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 90);
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
    return NextResponse.json({ error: 'বিষয়গুলোর তালিকা আনা যায়নি।' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'শুধু প্রশাসক বিষয় তৈরি করতে পারবেন।' }, { status: 401 });
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'বিষয়ের নাম ২ থেকে ৬০ অক্ষরের মধ্যে হতে হবে।' }, { status: 400 });
    }
    const base = makeSlug(name) || 'topic';
    const topic = await prisma.topic.create({
      data: { name, slug: `${base}-${randomUUID().slice(0, 6)}`, description: description || null },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/topics]', error);
    return NextResponse.json({ error: 'বিষয় তৈরি করা যায়নি। নামটি আগে থেকেই থাকতে পারে।' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 401 });
  try {
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
