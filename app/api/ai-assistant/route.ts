import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingRes = await embeddingModel.embedContent(message);
    const vectorSql = `[${embeddingRes.embedding.values.join(',')}]`;

    const matchedPosts = await prisma.$queryRaw<
      Array<{ id: string; title: string; slug: string; claimAddressed: string; excerpt: string; content: string }>
    >`
      SELECT id, title, slug, "claimAddressed", excerpt, content
      FROM "Post"
      WHERE published = true
      ORDER BY embedding <=> ${vectorSql}::vector
      LIMIT 3
    `;

    const contextBlock = matchedPosts
      .map(
        (p, i) =>
          `[Article ${i + 1}: ${p.title}]\nClaim Addressed: ${p.claimAddressed}\nContent: ${p.content}`
      )
      .join('\n\n---\n\n');

    const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await chatModel.generateContent([
      `You are Al-Burhan AI, a scholarly research assistant for Islamic apologetics, physics, and historical verification.\nAnswer the user's question clearly, citing the database articles below:\n\n${contextBlock}`,
      message,
    ]);

    const replyText = result.response.text();

    await prisma.aiChatSession.create({
      data: {
        query: message,
        response: replyText,
        citedIds: matchedPosts.map((p) => p.id),
      },
    });

    return NextResponse.json({
      reply: replyText,
      matchedPosts,
    });
  } catch (error) {
    console.error('[POST /api/ai-assistant]', error);
    return NextResponse.json({ error: 'AI search failed' }, { status: 500 });
  }
}
