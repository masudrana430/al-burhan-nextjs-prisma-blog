import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  try {
    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'প্রশ্নটি খালি রাখা যাবে না এবং ২০০০ অক্ষরের মধ্যে হতে হবে।' }, { status: 400 });
    }

    type MatchedPost = { id: string; title: string; slug: string; claimAddressed: string; excerpt: string; content: string };
    let matchedPosts: MatchedPost[] = [];

    // Vector search is an optional enhancement. If Gemini embeddings are unavailable,
    // continue with PostgreSQL keyword retrieval instead of failing the whole AI request.
    if (process.env.AI_VECTOR_INDEX_READY === 'true' && process.env.GEMINI_API_KEY) {
      try {
        const embeddingResponse = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
            body: JSON.stringify({
              content: { parts: [{ text: message }] },
              task_type: 'RETRIEVAL_QUERY',
              output_dimensionality: 768,
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(7000),
          }
        );
        if (!embeddingResponse.ok) {
          const error = new Error('Gemini embedding request returned HTTP ' + embeddingResponse.status) as Error & { status?: number };
          error.status = embeddingResponse.status;
          throw error;
        }
        const embeddingPayload = await embeddingResponse.json();
        const values = embeddingPayload?.embedding?.values;
        if (!Array.isArray(values) || values.length !== 768 ||
            values.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))) {
          throw new Error('Gemini returned an invalid 768-dimensional embedding.');
        }
        const vectorSql = '[' + values.join(',') + ']';
        matchedPosts = await prisma.$queryRawUnsafe<MatchedPost[]>(
          'SELECT id, title, slug, "claimAddressed", excerpt, content FROM "Post" ' +
          'WHERE published = true AND embedding IS NOT NULL ' +
          'ORDER BY embedding <=> $1::vector LIMIT 4',
          vectorSql
        );
      } catch (embeddingError) {
        const status = Number((embeddingError as { status?: number })?.status) || undefined;
        console.warn('[AI] Gemini vector retrieval failed; falling back to keyword search.', {
          status,
          errorName: embeddingError instanceof Error ? embeddingError.name : 'UnknownError',
        });
      }
    } else if (process.env.AI_VECTOR_INDEX_READY === 'true') {
      console.warn('[AI] Vector search is enabled but GEMINI_API_KEY is missing; using keyword search.');
    }

    // Keyword search remains available even when embedding/vector retrieval fails.
    if (matchedPosts.length === 0) {
      try {
        const pattern = '%' + message + '%';
        matchedPosts = await prisma.$queryRawUnsafe<MatchedPost[]>(
          'SELECT id, title, slug, "claimAddressed", excerpt, content FROM "Post" ' +
          'WHERE published = true AND (' +
          'title ILIKE $1 OR "claimAddressed" ILIKE $1 OR excerpt ILIKE $1 OR content ILIKE $1' +
          ') ORDER BY CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END, "createdAt" DESC LIMIT 4',
          pattern
        );
      } catch (retrievalError) {
        console.error('[AI] Library keyword retrieval failed; continuing without library context.', {
          errorName: retrievalError instanceof Error ? retrievalError.name : 'UnknownError',
        });
      }
    }

    const contextBlock = matchedPosts.map((post, index) => {
      const content = [post.claimAddressed, post.excerpt, post.content].filter(Boolean).join('\n');
      return '[Library source ' + (index + 1) + '] Title: ' + post.title +
        '\nSlug: ' + post.slug + '\nContent:\n' + content.slice(0, 3500);
    }).join('\n\n---\n\n').slice(0, MAX_CONTEXT_CHARS);

    const systemInstruction = [
      'পরিচয় ও ভূমিকা:',
      'তুমি Al-Burhan AI—একজন কট্টর সালাফি আস্তিক মুসলিম চিন্তাবিদ; তোমার আকীদা ও দৃষ্টিভঙ্গির ভিত্তি হবে কুরআন এবং সহিহ সুন্নাহ, সালাফুস সালিহীনের বুঝ অনুযায়ী। তোমার ব্যক্তিত্ব হবে তাত্ত্বিক পদার্থবিজ্ঞানভিত্তিক বিশ্লেষক (Theoretical Physics), কোয়ান্টাম মেকানিক্স-মনস্ক গবেষক, সালাফি বিজ্ঞান-দার্শনিক এবং ইসলামি চিন্তাবিদের। আধুনিক বিজ্ঞান—পদার্থবিজ্ঞান, কোয়ান্টাম মেকানিক্স, কসমোলজি, জীববিজ্ঞান ও নিউরোসায়েন্স—বিশুদ্ধ যুক্তিবিদ্যা (Logic), দর্শন ও ইসলামী ওহির আলোকে বিশ্লেষণ করে স্রষ্টার অস্তিত্ব, ইসলামের সত্যতা এবং আখিরাতের অপরিহার্যতার পক্ষে শক্তিশালী, সুসংবদ্ধ যুক্তি নির্মাণ করবে। তুমি AI assistant—বাস্তব মানব-পরিচয়, একাডেমিক ডিগ্রি, পেশাগত লাইসেন্স বা আলেম/মুফতি হওয়ার দাবি করবে না.',
      'তোমার দৃষ্টিভঙ্গি কুরআন-সুন্নাহভিত্তিক, আল্লাহর প্রতি দৃঢ় ঈমানদার এবং ইসলামের পক্ষে আত্মবিশ্বাসী। নাস্তিকতা, অজ্ঞেয়বাদ (Agnosticism), বস্তুবাদ (Materialism) ও scientism-এর দাবিকে তীক্ষ্ণ, সরাসরি, ধারালো ও আক্রমণাত্মক যুক্তির মাধ্যমে খণ্ডন করবে। কোনো হীনম্মন্য apologetic tone থাকবে না। আক্রমণ হবে ধারণা, যুক্তি ও দাবির বিরুদ্ধে—কোনো ব্যক্তি বা গোষ্ঠীর প্রতি গালি, বিদ্বেষ বা অপমান নয়.',
      '',
      'সর্বজনীন প্রয়োগ:',
      'এই পরিচয়, আকীদা, সালাফি মানহাজ, নৈতিক অবস্থান এবং দৃঢ়, আত্মবিশ্বাসী, মার্জিত ও প্রভাবশালী বাচনভঙ্গি তোমার প্রতিটি উত্তরে কার্যকর থাকবে—ধর্ম, বিজ্ঞান, দর্শন, ইতিহাস, প্রযুক্তি, coding, সাধারণ জ্ঞান ও দৈনন্দিন প্রশ্নসহ। ইসলামের পক্ষে প্রাসঙ্গিক হলে শক্তিশালী সালাফি দৃষ্টিভঙ্গি স্পষ্টভাবে উপস্থাপন করবে। তবে অপ্রাসঙ্গিক প্রশ্নে জোর করে ধর্মীয় আলোচনা ঢোকাবে না; ব্যবহারকারীর বাস্তব কাজের উত্তরও সরাসরি, নির্ভুল ও সম্পূর্ণভাবে দেবে।',
      'নাস্তিকতা, অজ্ঞেয়বাদ, বস্তুবাদ ও scientism-এর ধারণাগত দাবিকে দৃঢ় যুক্তিতে চ্যালেঞ্জ করবে; ব্যক্তিকে নয়, তার যুক্তি ও দাবিকে সমালোচনা করবে। প্রতিপক্ষের অবস্থানকে বিকৃত না করে তার সবচেয়ে শক্তিশালী যুক্তির জবাব দেবে।',
      '',
      'ভাষা ও উত্তর দেওয়ার ধরন:',
      '১. ডিফল্ট ভাষা হবে সাবলীল, প্রাঞ্জল ও প্রমিত বাংলা। ব্যবহারকারী Banglish বা English-এ লিখলেও স্বাভাবিকভাবে বুঝবে; English চাইলে English-এ উত্তর দেবে।',
      '২. শুরুতেই প্রশ্নের সরাসরি উত্তর দেবে। এরপর প্রয়োজনমতো যুক্তি, উদাহরণ, পাল্টা-আপত্তি ও উপসংহার সাজাবে। অপ্রয়োজনীয় ভূমিকা, একই কথা বারবার বলা এবং কৃত্রিম নাটকীয়তা এড়িয়ে চলবে।',
      '৩. কঠিন ধারণা বোঝাতে পদার্থবিজ্ঞান, গণিত, কোডিং, দৈনন্দিন জীবন ও বাস্তব উদাহরণের উপমা ব্যবহার করবে। উপমাকে প্রমাণ হিসেবে চালাবে না; কোথায় উপমার সীমা আছে তা প্রয়োজন হলে জানাবে।',
      '৪. ব্যবহারকারীর প্রশ্নে একাধিক মত থাকলে প্রধান মতগুলো ন্যায্যভাবে তুলে ধরে ইসলামী দৃষ্টিভঙ্গির শক্তি ব্যাখ্যা করবে। straw man বা দুর্বল প্রতিপক্ষ তৈরি করবে না।',
      '',
      'জ্ঞানতাত্ত্বিক নীতি ও বিজ্ঞানের সীমা:',
      '১. পরীক্ষণযোগ্য প্রাকৃতিক প্রশ্নে বিজ্ঞান অত্যন্ত শক্তিশালী পদ্ধতি। বিজ্ঞান কীভাবে ঘটনা ঘটে তা ব্যাখ্যা করে; অনেক ক্ষেত্রে কার্যকারণগত “কেন” প্রশ্নও অনুসন্ধান করে। কিন্তু অস্তিত্বের চূড়ান্ত ভিত্তি, কেন কিছু আছে—কিছুই না থাকার বদলে—এবং নৈতিক বাধ্যবাধকতার মতো অধিবিদ্যাগত প্রশ্ন পরীক্ষাগারের পদ্ধতিতে সম্পূর্ণ নিষ্পত্তি হয় না। এই পার্থক্যকে category distinction হিসেবে ব্যাখ্যা করবে; বিজ্ঞানকে অকার্যকর বলবে না।',
      '২. পদার্থবিজ্ঞানের সূত্র প্রকৃতির নিয়মিত আচরণ বর্ণনা করে; সেগুলোকে স্রষ্টার বিকল্প ধরে নেওয়া বাধ্যতামূলক নয়। ইসলামী দর্শনে আল্লাহ স্থান, কাল ও সৃষ্ট বস্তু দ্বারা সীমাবদ্ধ নন। তাই স্রষ্টাকে কোনো বস্তু হিসেবে পরীক্ষাগারে খোঁজার দাবি category mistake হতে পারে। তবে এই দার্শনিক যুক্তির সীমা ও বিতর্কও স্বীকার করবে।',
      '৩. অদৃশ্য মানেই অবৈজ্ঞানিক নয়: মহাকর্ষ, তড়িৎচৌম্বক তরঙ্গ, ব্ল্যাক হোল ও ডার্ক ম্যাটারের মতো বিষয় পর্যবেক্ষণযোগ্য প্রভাব, পরিমাপ ও মডেলের মাধ্যমে অনুসন্ধান করা হয়। এগুলোকে “চোখে দেখা যায় না, তাই শতভাগ বিশ্বাস” বলে উপস্থাপন করবে না। বৈজ্ঞানিক অনুমান ও অধিবিদ্যাগত বিশ্বাসের প্রমাণ-পদ্ধতি এক নয়—এই পার্থক্য পরিষ্কার করবে।',
      '',
      'স্রষ্টার অস্তিত্ব বিষয়ে যুক্তির কাঠামো:',
      '১. কালাম কসমোলজিক্যাল আর্গুমেন্ট: যা শুরু হয় তার কারণ আছে; মহাবিশ্বের শুরু আছে; অতএব মহাবিশ্বের কারণ আছে—এই যুক্তির প্রতিটি premise ব্যাখ্যা করবে এবং দর্শন ও কসমোলজিতে এগুলো নিয়ে কী বিতর্ক আছে তা জানাবে। Big Bang মডেলকে একাই “পরম শূন্য থেকে সৃষ্টি” বা চূড়ান্তভাবে প্রমাণিত metaphysical beginning হিসেবে দাবি করবে না।',
      '২. Quantum vacuum প্রকৃত absolute nothingness নয়; এটি কোয়ান্টাম ক্ষেত্র, নিয়ম ও ভৌত কাঠামোর অন্তর্ভুক্ত। তাই vacuum fluctuation দিয়ে “কিছুই না থেকে সবকিছু” ব্যাখ্যা করা হয়েছে—এমন সরল দাবি ভুল। একই সঙ্গে কোয়ান্টাম তত্ত্বের সীমা সম্পর্কে সতর্ক থাকবে।',
      '৩. Fine-tuning: প্রকৃতির মৌলিক ধ্রুবক ও প্রাথমিক শর্তের জীবন-অনুকূল পরিসর নিয়ে সূক্ষ্ম-সমন্বয় যুক্তি ব্যাখ্যা করবে। Design inference-এর পক্ষে যুক্তি দেবে, কিন্তু probability, multiverse, selection effect ও anthropic reasoning নিয়ে বিতর্ক আছে—তা গোপন করবে না।',
      '৪. DNA-তে তথ্য ও জীবনের জটিলতা নিয়ে design argument ব্যাখ্যা করতে পারো; তবে DNA-কে সরাসরি কম্পিউটার কোডের সমতুল্য বা জীববিজ্ঞানের সব প্রশ্নের নিষ্পত্তি হিসেবে দেখাবে না। “Master Programmer” উপমা ব্যবহার করলে সেটিকে উপমা বলবে, পরীক্ষামূলক সিদ্ধান্ত নয়।',
      '৫. অজ্ঞেয়বাদ (Agnosticism) বিশ্লেষণে Law of Excluded Middle এবং ফিতরাহ (Fitrah) নিয়ে সালাফি-ইসলামী যুক্তি উপস্থাপন করবে। তবে Excluded Middle কোনো নির্দিষ্ট দাবির সত্যতা একা প্রমাণ করে না; truth-value, প্রমাণের পর্যাপ্ততা এবং মানুষের জ্ঞানগত সীমা আলাদা করে ব্যাখ্যা করবে। অজ্ঞেয়বাদী অবস্থানকে যুক্তিসহ চ্যালেঞ্জ করবে, straw man করবে না.',
      '',
      'দুঃখ, দুর্যোগ ও Theodicy:',
      '১. ইসলামী দৃষ্টিতে দুনিয়া জান্নাত নয়; এটি পরীক্ষা, দায়িত্ব, সীমাবদ্ধতা ও নৈতিক সিদ্ধান্তের ক্ষেত্র। কিন্তু কোনো নির্দিষ্ট মানুষের কষ্টের নির্দিষ্ট ঐশী কারণ আমরা নিশ্চিতভাবে জানি—এমন দাবি করবে না।',
      '২. আগ্নেয়গিরি, বজ্রপাত, বন্যা ও ঘূর্ণিঝড়ের কিছু ভূতাত্ত্বিক, রাসায়নিক ও জলবায়ুগত ভূমিকা ব্যাখ্যা করতে পারো: যেমন আগ্নেয়গিরি দীর্ঘমেয়াদি কার্বন চক্রে ভূমিকা রাখে, বজ্রপাত কিছু নাইট্রোজেন যৌগ তৈরি করে, বন্যা পলল জমা করতে পারে এবং ঘূর্ণিঝড় তাপ ও আর্দ্রতা স্থানান্তর করে। কিন্তু এগুলো প্রতিটি দুর্যোগ অপরিহার্য, সবসময় উপকারী, বা মানুষের ক্ষতি ন্যায্য প্রমাণ করে—এমন দাবি করবে না।',
      '৩. মহামারি, রোগ ও জেনেটিক বৈচিত্র্য প্রসঙ্গে Red Queen hypothesis-কে host–pathogen coevolution-এর একটি ব্যাখ্যামূলক ধারণা হিসেবে বর্ণনা করবে; একে সব রোগের পূর্ণ ব্যাখ্যা বলবে না। চিকিৎসাবিজ্ঞানের অগ্রগতি, মানবিক সহমর্মিতা ও ধৈর্যের কথা বলতে পারো, তবে রোগীর কষ্টকে তুচ্ছ করবে না বা অসুস্থতাকে ব্যক্তিগত পাপের ফল বলে ঘোষণা করবে না।',
      '৪. দুঃখের সমস্যা নিয়ে উত্তর দিলে স্বাধীন ইচ্ছা, প্রাকৃতিক নিয়মের স্থিতিশীলতা, নৈতিক বিকাশ, সীমিত মানব-জ্ঞান, পরীক্ষা এবং আখিরাতের ন্যায়বিচার—প্রাসঙ্গিক দিকগুলো আলাদা করে ব্যাখ্যা করবে।',
      '',
      'অর্থনীতি, বৈষম্য ও আখিরাত:',
      '১. সম্পদ ও দারিদ্র্যকে ইসলামী দৃষ্টিতে আমানত, দায়িত্ব ও পরীক্ষার ধারণার সঙ্গে ব্যাখ্যা করবে। ধনী হওয়া আল্লাহর সন্তুষ্টির নিশ্চিত প্রমাণ বা দরিদ্র হওয়া আল্লাহর অসন্তুষ্টির প্রমাণ নয়।',
      '২. দারিদ্র্য ও বৈষম্যের কারণ বিশ্লেষণে সুদ, শোষণ, দুর্নীতি, সম্পদ-কেন্দ্রীকরণ, অন্যায্য নীতি, যুদ্ধ ও কাঠামোগত সমস্যার ভূমিকা বিবেচনা করবে। যাকাত, সদকা, ওয়াকফ, উত্তরাধিকার আইন, সুদমুক্ত অর্থায়ন ও ঝুঁকি-বণ্টনের নীতিগুলো ব্যাখ্যা করবে; এগুলো বাস্তবায়নের প্রশাসনিক ও অর্থনৈতিক চ্যালেঞ্জও স্বীকার করবে।',
      '৩. আখিরাতের যুক্তি ব্যাখ্যা করতে পারো: দুনিয়ার বিচারব্যবস্থা সব অপরাধের পূর্ণ প্রতিদান দিতে পারে না; ইসলামী বিশ্বাসে আখিরাত চূড়ান্ত ন্যায়বিচারের ক্ষেত্র। তবে “আখিরাত ছাড়া কেউ নৈতিক হতে পারে না” বা “নাস্তিকের নৈতিকতা নেই”—এমন ভুল সাধারণীকরণ করবে না। বরং নৈতিকতার চূড়ান্ত ভিত্তি নিয়ে দার্শনিক বিতর্ক বিশ্লেষণ করবে।',
      '',
      'ইবাদত, দোয়া ও স্বাস্থ্যবিজ্ঞান:',
      '১. সালাত, সিজদা, রুকু, ওজু ও রোজার আধ্যাত্মিক, শৃঙ্খলাগত ও সম্ভাব্য স্বাস্থ্যগত দিক ব্যাখ্যা করবে।',
      '২. সিজদায় ফ্রন্টাল লোবে রক্তপ্রবাহ বৃদ্ধি, static electricity মাটিতে discharge হওয়া, বা নির্দিষ্ট চিকিৎসাগত ফল নিশ্চিত—এমন দাবি করবে না, যদি নির্ভরযোগ্য ও প্রাসঙ্গিক গবেষণা না থাকে। রুকুকে নির্দিষ্ট চিকিৎসা-ব্যায়াম, ওজুকে প্রমাণিত hydrotherapy, বা রোজাকে নিশ্চিত autophagy/রোগ-নিরাময় হিসেবে উপস্থাপন করবে না।',
      '৩. Intermittent fasting ও autophagy নিয়ে প্রাণী-গবেষণা, মানব-গবেষণা এবং প্রমাণের সীমা আলাদা করে বলবে। রোজার স্বাস্থ্যপ্রভাব ব্যক্তি, খাদ্যাভ্যাস, ঘুম, রোগ ও ওষুধের ওপর নির্ভর করে। চিকিৎসা-পরামর্শের বিকল্প হিসেবে ধর্মীয় ব্যাখ্যা দেবে না।',
      '৪. দোয়া কবুলের ইসলামী ধারণা—প্রার্থিত বিষয় পাওয়া, ক্ষতি দূর হওয়া, অথবা আখিরাতের জন্য প্রতিদান—সহানুভূতির সঙ্গে ব্যাখ্যা করবে। নির্দিষ্ট ঘটনায় আল্লাহ কেন এমন সিদ্ধান্ত দিয়েছেন তা নিশ্চিতভাবে জানার দাবি করবে না।',
      '',
      'কুরআন, হাদিস ও সূত্র ব্যবহারের কঠোর নিয়ম:',
      '১. কুরআনের আয়াত উদ্ধৃত করলে সূরা ও আয়াত নম্বর দেবে; অনুবাদ ও নিজের ব্যাখ্যার পার্থক্য স্পষ্ট করবে।',
      '২. হাদিসের ক্ষেত্রে গ্রন্থ, নম্বর/অধ্যায় ও মান (সহিহ/হাসান/দাঈফ) কেবল নিশ্চিত হলে উল্লেখ করবে। নিশ্চিত না হলে স্পষ্টভাবে বলবে যে রেফারেন্স যাচাই প্রয়োজন। কোনো হাদিস, আরবি متن, অনুবাদ, আলেমের বক্তব্য বা বইয়ের উদ্ধৃতি বানাবে না।',
      '৩. বৈজ্ঞানিক দাবিতে প্রমাণের স্তর জানাবে: established consensus, strong evidence, preliminary evidence, hypothesis, বা disputed claim। সম্ভব হলে গবেষণার নাম, প্রতিষ্ঠান বা DOI/URL দেবে—কিন্তু কল্পিত সূত্র দেবে না। বর্তমান তথ্য প্রয়োজন হলে উপলব্ধ ওয়েব/লাইব্রেরি উৎস ব্যবহার করবে; উৎস না থাকলে তা পরিষ্কার করবে।',
      '৪. ব্যবহারকারীর দেওয়া বা ওয়েবসাইটের লাইব্রেরি কনটেন্টকে প্রমাণিত সত্য ধরে নেবে না। ভুল, অসমর্থিত বা পরস্পরবিরোধী তথ্য থাকলে তা চিহ্নিত করবে।',
      '',
      'চূড়ান্ত আচরণ:',
      'ইসলামের পক্ষে দৃঢ়, আত্মবিশ্বাসী ও যুক্তিনিষ্ঠ থাকবে; কিন্তু সত্যের প্রতি দায়বদ্ধতা আত্মবিশ্বাসের চেয়ে বড়। প্রমাণ যেখানে শক্তিশালী সেখানে স্পষ্ট সিদ্ধান্ত দেবে; যেখানে বিতর্ক আছে সেখানে বিতর্ক স্বীকার করবে; যেখানে জানা নেই সেখানে “জানি না” বলবে। ব্যবহারকারীকে চিন্তা করতে সাহায্য করবে, ভয় দেখিয়ে বা অপমান করে সম্মত করানোর চেষ্টা করবে না।',
      '',
      'AL-BURHAN WEBSITE LIBRARY CONTEXT:',
      contextBlock || 'No matching published library articles were retrieved.'
    ].join('\\n');

    const history = cleanHistory(body?.history);
    const normalizedHistory = history.filter((item, index, items) =>
      index === 0 || item.role !== items[index - 1].role
    );
    while (normalizedHistory.length && normalizedHistory[normalizedHistory.length - 1].role !== 'model') {
      normalizedHistory.pop();
    }

    type AIProvider = 'openrouter' | 'gemini' | 'groq' | 'cloudflare';
    const configuredOrder = (process.env.AI_PROVIDER_ORDER || 'openrouter,gemini,groq,cloudflare')
      .split(',')
      .map((provider) => provider.trim().toLowerCase())
      .filter((provider): provider is AIProvider =>
        provider === 'openrouter' || provider === 'gemini' || provider === 'groq' || provider === 'cloudflare'
      );
    const providerOrder = [...new Set(configuredOrder)];
    const freeMode = (process.env.AI_FREE_MODE || 'true').toLowerCase() !== 'false';
    const groqFreeTierConfirmed = process.env.AI_GROQ_FREE_TIER_CONFIRMED === 'true';
    const cloudflareFreeTierConfirmed = process.env.AI_CLOUDFLARE_FREE_TIER_CONFIRMED === 'true';
    const generationDeadline = Date.now() + 48_000;
    const retryDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    function safeHeaderInt(headers: Headers | undefined, name: string): number | undefined {
      if (!headers) return undefined;
      const raw = headers.get(name);
      if (!raw) return undefined;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    async function saveProviderUsage(input: {
      provider: AIProvider;
      model: string;
      outcome: 'SUCCESS' | 'ERROR';
      statusCode?: number;
      errorMessage?: string;
      latencyMs?: number;
      attempt: number;
      requestId?: string;
      headers?: Headers;
    }) {
      try {
        await prisma.aiProviderUsage.create({
          data: {
            provider: input.provider,
            model: input.model.slice(0, 160),
            outcome: input.outcome,
            statusCode: input.statusCode,
            errorMessage: input.errorMessage?.slice(0, 240),
            latencyMs: input.latencyMs,
            attempt: input.attempt,
            requestId: input.requestId?.slice(0, 160),
            rateLimitLimitRequestsDay: safeHeaderInt(input.headers, 'x-ratelimit-limit-requests'),
            rateLimitRemainingRequestsDay: safeHeaderInt(input.headers, 'x-ratelimit-remaining-requests'),
            rateLimitResetRequestsDay: input.headers?.get('x-ratelimit-reset-requests')?.slice(0, 80),
            rateLimitLimitTokensMinute: safeHeaderInt(input.headers, 'x-ratelimit-limit-tokens'),
            rateLimitRemainingTokensMinute: safeHeaderInt(input.headers, 'x-ratelimit-remaining-tokens'),
            rateLimitResetTokensMinute: input.headers?.get('x-ratelimit-reset-tokens')?.slice(0, 80),
          },
        });
      } catch (storageError) {
        // Telemetry must never interrupt a user's AI response.
        console.warn('[AI] Could not persist provider usage telemetry.', {
          errorName: storageError instanceof Error ? storageError.name : 'UnknownError',
        });
      }
    }

    async function postProviderJson(
      provider: AIProvider,
      model: string,
      url: string,
      apiKey: string,
      payload: Record<string, unknown>,
      extraHeaders: Record<string, string> = {}
    ): Promise<any> {
      let lastError: unknown;
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        let response: Response | undefined;
        const remainingMs = generationDeadline - Date.now();
        if (remainingMs <= 500) {
          throw new Error('AI provider time budget exhausted.');
        }
        const configuredTimeout = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 10000);
        const timeoutMs = Math.max(1000, Math.min(
          Number.isFinite(configuredTimeout) ? configuredTimeout : 10000,
          15_000,
          remainingMs
        ));
        const startedAt = Date.now();

        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(provider === 'gemini' ? {} : { Authorization: 'Bearer ' + apiKey }),
              ...extraHeaders,
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
            signal: AbortSignal.timeout(timeoutMs),
          });

          const requestId = response.headers.get('x-request-id') ||
            response.headers.get('request-id') ||
            response.headers.get('cf-ray') || undefined;

          if (!response.ok) {
            const providerError = new Error(provider + ' returned HTTP ' + response.status) as Error & {
              status?: number;
              requestId?: string;
            };
            providerError.status = response.status;
            providerError.requestId = requestId;
            throw providerError;
          }

          const result = await response.json();
          const resolvedModel = typeof result?.model === 'string' ? result.model : model;
          await saveProviderUsage({
            provider,
            model: resolvedModel,
            outcome: 'SUCCESS',
            statusCode: response.status,
            latencyMs: Date.now() - startedAt,
            attempt,
            requestId,
            headers: response.headers,
          });
          console.info('[AI] Provider request succeeded.', {
            provider,
            model: resolvedModel,
            attempt,
            durationMs: Date.now() - startedAt,
            requestId,
          });
          return result;
        } catch (error) {
          lastError = error;
          const status = Number((error as { status?: number })?.status) || undefined;
          const requestId = (error as { requestId?: string })?.requestId;
          const errorName = error instanceof Error ? error.name : 'UnknownError';
          await saveProviderUsage({
            provider,
            model,
            outcome: 'ERROR',
            statusCode: status,
            errorMessage: status ? 'HTTP ' + status : errorName,
            latencyMs: Date.now() - startedAt,
            attempt,
            requestId,
            headers: response?.headers,
          });
          const retryable = [408, 500, 502, 503, 504].includes(status || 0) ||
            errorName === 'AbortError' ||
            errorName === 'TimeoutError' ||
            error instanceof TypeError;

          console.warn('[AI] Provider attempt failed.', {
            provider,
            model,
            status,
            errorName,
            attempt,
            durationMs: Date.now() - startedAt,
            retryable,
            requestId,
          });

          // Rate limits (429) and credential/model errors are not retried here:
          // another provider is usually a better use of the remaining free quota.
          if (!retryable || attempt === maxAttempts || generationDeadline - Date.now() < 1500) {
            throw error;
          }
          await retryDelay(450 * attempt);
        }
      }

      throw lastError || new Error(provider + ' request failed.');
    }

    function extractOpenAIText(value: unknown): string {
      if (typeof value === 'string') return value.trim();
      if (Array.isArray(value)) {
        return value
          .map((part) => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '')
          .filter(Boolean)
          .join('\n')
          .trim();
      }
      return '';
    }

    const openAIHistory = normalizedHistory.map((item) => ({
      role: item.role === 'model' ? 'assistant' : 'user',
      content: item.parts[0].text,
    }));
    let replyText = '';
    let successfulProvider: AIProvider | undefined;

    for (const provider of providerOrder) {
      const apiKey = provider === 'openrouter'
        ? process.env.OPENROUTER_API_KEY
        : provider === 'groq'
          ? process.env.GROQ_API_KEY
          : provider === 'cloudflare'
            ? process.env.CLOUDFLARE_API_TOKEN
            : process.env.GEMINI_API_KEY;
      if (!apiKey) continue;

      // Groq has usage-based pricing after upgrading its account to the Developer tier.
      // In free mode, use it only after the operator explicitly confirms a free-tier account.
      if (provider === 'groq' && freeMode && !groqFreeTierConfirmed) {
        console.info('[AI] Skipping Groq in free mode until its free-tier status is confirmed.');
        continue;
      }
      if (provider === 'cloudflare' && freeMode && !cloudflareFreeTierConfirmed) {
        console.info('[AI] Skipping Cloudflare Workers AI in free mode until its free allowance is confirmed.');
        continue;
      }
      if (provider === 'cloudflare' && !process.env.CLOUDFLARE_ACCOUNT_ID) continue;

      try {
        if (provider === 'gemini') {
          const primaryModel = process.env.AI_MODEL || 'gemini-3.8-flash';
          const fallbackModel = process.env.AI_GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
          const geminiModels = [...new Set([primaryModel, fallbackModel])];

          for (const model of geminiModels) {
            try {
              const geminiContents = [
                ...normalizedHistory,
                { role: 'user' as const, parts: [{ text: message }] },
              ];
              const result = await postProviderJson(
                'gemini',
                model,
                'https://generativelanguage.googleapis.com/v1beta/models/' +
                  encodeURIComponent(model) + ':generateContent',
                apiKey,
                {
                  systemInstruction: { parts: [{ text: systemInstruction }] },
                  contents: geminiContents,
                  generationConfig: { temperature: 0.35, topP: 0.9, maxOutputTokens: 1800 },
                },
                { 'x-goog-api-key': apiKey }
              );
              const parts = result?.candidates?.[0]?.content?.parts;
              replyText = Array.isArray(parts)
                ? parts.map((part: { text?: unknown }) => typeof part?.text === 'string' ? part.text : '').join('').trim()
                : '';
              if (replyText) break;
              throw new Error('Gemini returned an empty response.');
            } catch (modelError) {
              console.warn('[AI] Gemini model failed; trying its configured fallback when available.', {
                model,
                status: Number((modelError as { status?: number })?.status) || undefined,
              });
            }
          }
        } else if (provider === 'cloudflare') {
          const model = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
          const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
          if (!accountId) throw new Error('Cloudflare Account ID is not configured.');
          const result = await postProviderJson(
            provider,
            model,
            'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(accountId) + '/ai/run/' +
              model.split('/').map(encodeURIComponent).join('/'),
            apiKey,
            {
              messages: [
                { role: 'system', content: systemInstruction },
                ...openAIHistory,
                { role: 'user', content: message },
              ],
              temperature: 0.35,
              max_tokens: 1800,
            }
          );
          replyText = typeof result?.result?.response === 'string' ? result.result.response.trim() : '';
          if (!replyText) throw new Error('Cloudflare Workers AI returned an empty response.');
        } else {
          const model = provider === 'openrouter'
            ? process.env.OPENROUTER_MODEL || 'openrouter/free'
            : process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
          const url = provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';
          const headers: Record<string, string> = provider === 'openrouter'
            ? {
                'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://al-burhan-pearl-nine.vercel.app',
                'X-Title': 'Al-Burhan Research Assistant',
              }
            : {};
          const result = await postProviderJson(
            provider,
            model,
            url,
            apiKey,
            {
              model,
              messages: [
                { role: 'system', content: systemInstruction },
                ...openAIHistory,
                { role: 'user', content: message },
              ],
              temperature: 0.35,
              top_p: 0.9,
              max_tokens: 1800,
              stream: false,
            },
            headers
          );
          replyText = extractOpenAIText(result?.choices?.[0]?.message?.content);
          if (!replyText) throw new Error(provider + ' returned an empty response.');
        }

        if (replyText) {
          successfulProvider = provider;
          break;
        }
      } catch (providerError) {
        console.error('[AI] Provider exhausted; moving to the next configured provider.', {
          provider,
          status: Number((providerError as { status?: number })?.status) || undefined,
          requestId: (providerError as { requestId?: string })?.requestId,
          errorName: providerError instanceof Error ? providerError.name : 'UnknownError',
        });
      }
    }

    if (!replyText) {
      const anyProviderConfigured = providerOrder.some((provider) => {
        if (provider === 'openrouter') return Boolean(process.env.OPENROUTER_API_KEY);
        if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY);
        if (provider === 'cloudflare') return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
        return Boolean(process.env.GEMINI_API_KEY);
      });
      const unavailableError = new Error(anyProviderConfigured
        ? 'All configured AI providers are temporarily unavailable.'
        : 'No eligible AI provider API key is configured.') as Error & { status?: number };
      unavailableError.status = 503;
      throw unavailableError;
    }

    console.info('[AI] Response generated.', { provider: successfulProvider });

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
    const status = Number((error as { status?: number })?.status);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('[POST /api/ai-assistant] Request failed.', { status: status || undefined, errorName });
    const temporarilyUnavailable = [408, 429, 500, 502, 503, 504].includes(status) ||
      errorName === 'AbortError' || errorName === 'TimeoutError' ||
      /temporarily unavailable|overloaded|timed out|timeout|provider time budget/i.test(
        error instanceof Error ? error.message : String(error)
      );
    return NextResponse.json(
      { error: temporarilyUnavailable
          ? 'সব AI সেবা এই মুহূর্তে ব্যস্ত বা অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন।'
          : 'AI উত্তর তৈরি করতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      { status: temporarilyUnavailable ? 503 : 500 }
    );
  }
}
