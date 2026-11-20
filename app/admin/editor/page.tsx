import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TopicEditor from './topic-editor';

export const dynamic = 'force-dynamic';

export default async function AdminEditorPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session as { user?: { role?: string } } | null)?.user;
  if (sessionUser?.role !== 'ADMIN') redirect('/login');
  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } },
  });
  return <TopicEditor initialTopics={topics.map(topic => ({
    id: topic.id, name: topic.name, description: topic.description || '',
    postCount: topic._count.posts,
  }))} />;
}
