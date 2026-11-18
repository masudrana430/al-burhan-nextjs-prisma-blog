import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_CHARS = 14000;
const requestTimes = new Map<string, number[]>();
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (requestTimes.get(userId) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    requestTimes.set(userId, recent);
    return true;
  }
  recent.push(now);
  requestTimes.set(userId, recent);
  return false;
}

function cleanHistory(value: unknown): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY_MESSAGES)
    .filter((item) => item && typeof item === 'object' &&
      (((item as { role?: unknown }).role === 'user') || ((item as { role?: unknown }).role === 'assistant')) &&
      typeof (item as { text?: unknown }).text === 'string')
    .map((item) => ({
      role: (item as { role: string }).role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: (item as { text: string }).text.slice(0, MAX_MESSAGE_LENGTH) }],
    }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ({ id?: string; role?: string } | undefined);

  if (!user?.id || !['ADMIN', 'READER'].includes(user.role || '')) {
    return NextResponse.json({ error: 'AI assistant ব্যবহার করতে প্রথমে লগইন করুন।' }, { status: 401 });
  }
  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: 'আপনি অল্প সময়ে অনেকগুলো প্রশ্ন করেছেন। এক মিনিট পর আবার চেষ্টা করুন।' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[AI] GEMINI_API_KEY is not configured.');
    return NextResponse.json({ error: 'AI service is not configured yet.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'প্রশ্নটি খালি রাখা যাবে না এবং ২০০০ অক্ষরের মধ্যে হতে হবে।' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingRes = await embeddingModel.embedContent(message);
    const vectorSql = '[' + embeddingRes.embedding.values.join(',') + ']';
    if (!/^\[-?\d+(\.\d+)?(,-?\d+(\.\d+)?)*\]$/.test(vectorSql)) {
      throw new Error('Invalid embedding vector returned by provider.');
    }

    const matchedPosts = await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; slug: string; claimAddressed: string; excerpt: string; content: string }>
    >(
      'SELECT id, title, slug, "claimAddressed", excerpt, content FROM "Post" ' +
      'WHERE published = true ORDER BY embedding <=> $1::vector LIMIT 4',
      vectorSql
    );

    const contextBlock = matchedPosts.map((post, index) => {
      const content = [post.claimAddressed, post.excerpt, post.content].filter(Boolean).join('\n');
      return '[Library source ' + (index + 1) + '] Title: ' + post.title +
        '\nSlug: ' + post.slug + '\nContent:\n' + content.slice(0, 3500);
    }).join('\n\n---\n\n').slice(0, MAX_CONTEXT_CHARS);

    const systemInstruction = 'You are Al-Burhan AI, a careful scholarly research assistant for Islamic studies, Quran, Hadith, science, philosophy, history, language, and evidence-based analysis.\n' +
      'Reply in natural Bengali by default; understand Bangla, English, and Banglish. Use English when explicitly requested.\n' +
      'Use library excerpts as context, not unquestionable authority. Never invent Quran verse numbers, Hadith wording, book titles, scholars, quotations, URLs, or citations. Distinguish established facts, scholarly interpretations, disputed claims, and your own explanation. For Hadith, give collection/reference only when supported by reliable context; otherwise say verification is needed. Explain disagreements fairly. If the library lacks information, say so. Do not claim to be a mufti or issue binding fatwas. Be clear, structured, respectful, and sufficiently detailed.\n\n' +
      'AL-BURHAN LIBRARY CONTEXT:\n' + (contextBlock || 'No matching published library articles were retrieved.');

    const model = genAI.getGenerativeModel({
      model: process.env.AI_MODEL || 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: { temperature: 0.35, topP: 0.9, maxOutputTokens: 1800 },
    });

    const history = cleanHistory(body?.history);
    const normalizedHistory = history.filter((item, index, items) =>
      index === 0 || item.role !== items[index - 1].role
    );
    while (normalizedHistory.length && normalizedHistory[normalizedHistory.length - 1].role !== 'model') {
      normalizedHistory.pop();
    }

    const chat = model.startChat({ history: normalizedHistory });
    const result = await chat.sendMessage(message);
    const replyText = result.response.text()?.trim();
    if (!replyText) {
      return NextResponse.json({ error: 'AI থেকে কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।' }, { status: 502 });
    }

    await prisma.aiChatSession.create({
      data: { query: message, response: replyText, citedIds: matchedPosts.map((post) => post.id) },
    });

    return NextResponse.json({
      reply: replyText,
      matchedPosts: matchedPosts.map(({ id, title, slug }) => ({ id, title, slug })),
    });
  } catch (error) {
    console.error('[POST /api/ai-assistant]', error);
    return NextResponse.json({ error: 'AI request failed. Please try again shortly.' }, { status: 500 });
  }
}
