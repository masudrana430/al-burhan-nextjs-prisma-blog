import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dhakaDayStart(now: Date): Date {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(date + 'T00:00:00+06:00');
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as ({ role?: string } | undefined);
  if (sessionUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const now = new Date();
    const todayStart = dhakaDayStart(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [modelGroups, todayGroups, recentFailures, latestGroqQuota] = await Promise.all([
      prisma.aiProviderUsage.groupBy({
        by: ['provider', 'model', 'outcome'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
        _avg: { latencyMs: true },
        _max: { createdAt: true },
      }),
      prisma.aiProviderUsage.groupBy({
        by: ['provider', 'outcome'],
        where: { createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
      prisma.aiProviderUsage.findMany({
        where: { outcome: 'ERROR', createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true, provider: true, model: true, statusCode: true,
          errorMessage: true, latencyMs: true, attempt: true, createdAt: true,
        },
      }),
      prisma.aiProviderUsage.findFirst({
        where: { provider: 'groq', rateLimitLimitRequestsDay: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: {
          rateLimitLimitRequestsDay: true,
          rateLimitRemainingRequestsDay: true,
          rateLimitResetRequestsDay: true,
          rateLimitLimitTokensMinute: true,
          rateLimitRemainingTokensMinute: true,
          rateLimitResetTokensMinute: true,
          createdAt: true,
        },
      }),
    ]);

    const configuredOrder = (process.env.AI_PROVIDER_ORDER || 'openrouter,gemini,groq,cloudflare')
      .split(',').map((item) => item.trim().toLowerCase());
    const freeMode = (process.env.AI_FREE_MODE || 'true').toLowerCase() !== 'false';
    const groqConfirmed = process.env.AI_GROQ_FREE_TIER_CONFIRMED === 'true';
    const cloudflareConfirmed = process.env.AI_CLOUDFLARE_FREE_TIER_CONFIRMED === 'true';

    const providerConfig = [
      {
        id: 'openrouter',
        name: 'OpenRouter',
        keyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
        enabled: configuredOrder.includes('openrouter') && Boolean(process.env.OPENROUTER_API_KEY),
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        keyConfigured: Boolean(process.env.GEMINI_API_KEY),
        enabled: configuredOrder.includes('gemini') && Boolean(process.env.GEMINI_API_KEY),
        model: (process.env.AI_MODEL || 'gemini-3.8-flash') +
          ' / ' + (process.env.AI_GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'),
      },
      {
        id: 'groq',
        name: 'Groq',
        keyConfigured: Boolean(process.env.GROQ_API_KEY),
        enabled: configuredOrder.includes('groq') && Boolean(process.env.GROQ_API_KEY) &&
          (!freeMode || groqConfirmed),
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      },
      {
        id: 'cloudflare',
        name: 'Cloudflare Workers AI',
        keyConfigured: Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
        enabled: configuredOrder.includes('cloudflare') && Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) &&
          (!freeMode || cloudflareConfirmed),
        model: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        accountConfigured: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID),
        freeTierConfirmed: cloudflareConfirmed,
        statusReason: !process.env.CLOUDFLARE_API_TOKEN
          ? 'CLOUDFLARE_API_TOKEN is missing'
          : !process.env.CLOUDFLARE_ACCOUNT_ID
            ? 'CLOUDFLARE_ACCOUNT_ID is missing'
            : freeMode && !cloudflareConfirmed
              ? 'Paused: confirm Cloudflare free-tier eligibility first'
              : 'Credentials configured; eligible for provider fallback',
        quota: { allowance: 'Up to 10,000 Neurons/day on the Workers AI Free allocation (subject to account eligibility)', source: 'Cloudflare account dashboard; exact remaining Neurons are not exposed by the inference response' },
      },
    ];

    const todayByProvider: Record<string, { success: number; failed: number }> = {};
    for (const row of todayGroups) {
      const current = todayByProvider[row.provider] || { success: 0, failed: 0 };
      if (row.outcome === 'SUCCESS') current.success = row._count._all;
      if (row.outcome === 'ERROR') current.failed = row._count._all;
      todayByProvider[row.provider] = current;
    }

    const modelMap = new Map<string, {
      provider: string; model: string; success: number; failed: number;
      avgLatencyMs: number | null; lastUsedAt: string | null;
    }>();
    for (const row of modelGroups) {
      const key = row.provider + '::' + row.model;
      const current = modelMap.get(key) || {
        provider: row.provider, model: row.model, success: 0, failed: 0,
        avgLatencyMs: null, lastUsedAt: null,
      };
      if (row.outcome === 'SUCCESS') current.success = row._count._all;
      if (row.outcome === 'ERROR') current.failed = row._count._all;
      if (row._avg.latencyMs !== null) current.avgLatencyMs = Math.round(row._avg.latencyMs);
      if (row._max.createdAt) current.lastUsedAt = row._max.createdAt.toISOString();
      modelMap.set(key, current);
    }
    const models = Array.from(modelMap.values())
      .sort((a, b) => (b.success + b.failed) - (a.success + a.failed));

    let openRouterQuota: Record<string, unknown> | null = null;
    let openRouterQuotaError: string | null = null;
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/key', {
          headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          openRouterQuotaError = 'OpenRouter quota API returned HTTP ' + response.status;
        } else {
          const payload = await response.json();
          const data = payload?.data || {};
          const freeDaily = data.free_model_daily_requests || {};
          openRouterQuota = {
            isFreeTier: typeof data.is_free_tier === 'boolean' ? data.is_free_tier : null,
            daily: {
              used: asNumber(freeDaily.used),
              limit: asNumber(freeDaily.limit),
              remaining: asNumber(freeDaily.remaining),
            },
            creditLimit: asNumber(data.limit),
            creditRemaining: asNumber(data.limit_remaining),
            creditReset: typeof data.limit_reset === 'string' ? data.limit_reset : null,
            usageDaily: asNumber(data.usage_daily),
          };
        }
      } catch (error) {
        openRouterQuotaError = error instanceof Error ? error.name : 'Unable to read OpenRouter quota';
      }
    }

    const totals = todayGroups.reduce((sum, row) => {
      if (row.outcome === 'SUCCESS') sum.success += row._count._all;
      if (row.outcome === 'ERROR') sum.failed += row._count._all;
      return sum;
    }, { success: 0, failed: 0 });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      todayTimezone: 'Asia/Dhaka',
      trackingWindowDays: 30,
      summary: {
        successfulProviderResponsesToday: totals.success,
        failedProviderAttemptsToday: totals.failed,
        totalProviderAttemptsToday: totals.success + totals.failed,
      },
      providers: providerConfig.map((provider) => ({
        ...provider,
        today: todayByProvider[provider.id] || { success: 0, failed: 0 },
        quota: provider.id === 'openrouter'
          ? openRouterQuota
          : provider.id === 'cloudflare'
            ? provider.quota
            : provider.id === 'groq' && latestGroqQuota
            ? {
                source: 'latest Groq response headers',
                requestsPerDay: {
                  limit: latestGroqQuota.rateLimitLimitRequestsDay,
                  remaining: latestGroqQuota.rateLimitRemainingRequestsDay,
                  reset: latestGroqQuota.rateLimitResetRequestsDay,
                },
                tokensPerMinute: {
                  limit: latestGroqQuota.rateLimitLimitTokensMinute,
                  remaining: latestGroqQuota.rateLimitRemainingTokensMinute,
                  reset: latestGroqQuota.rateLimitResetTokensMinute,
                },
                capturedAt: latestGroqQuota.createdAt.toISOString(),
              }
            : null,
      })),
      openRouterQuotaError,
      models,
      recentFailures: recentFailures.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      notes: {
        history: 'Provider/model tracking starts after this monitor is deployed; older AI chat records do not contain provider metadata.',
        geminiQuota: 'Gemini API does not expose a remaining daily quota in ordinary generateContent responses. This page reports this website’s tracked usage, not the whole Google project quota.',
        groqQuota: 'Groq quota values come from the latest inference response headers and can be stale until that provider is used again.',
        cloudflareQuota: 'Cloudflare Workers AI free allocation is up to 10,000 Neurons/day; exact remaining balance is not returned by ordinary inference responses and must be checked in the Cloudflare dashboard.',
        openRouterQuota: 'OpenRouter free-model daily usage is read live from the current API key endpoint. It includes use of that key outside this website.',
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('[Admin AI Usage] Failed to load monitor.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'AI usage data could not be loaded.' }, { status: 500 });
  }
}
