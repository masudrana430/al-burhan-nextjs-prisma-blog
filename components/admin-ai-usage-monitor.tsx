'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertCircle, CheckCircle2, Cpu, RefreshCw,
  ShieldAlert, Gauge, CircleHelp,
} from 'lucide-react';

type Provider = {
  id: string;
  name: string;
  keyConfigured: boolean;
  enabled: boolean;
  model: string;
  today: { success: number; failed: number };
  quota: any;
};
type ModelUsage = {
  provider: string;
  model: string;
  success: number;
  failed: number;
  avgLatencyMs: number | null;
  lastUsedAt: string | null;
};
type MonitorData = {
  generatedAt: string;
  summary: {
    successfulProviderResponsesToday: number;
    failedProviderAttemptsToday: number;
    totalProviderAttemptsToday: number;
  };
  providers: Provider[];
  openRouterQuotaError: string | null;
  models: ModelUsage[];
  recentFailures: Array<{
    id: string;
    provider: string;
    model: string;
    statusCode: number | null;
    errorMessage: string | null;
    latencyMs: number | null;
    attempt: number;
    createdAt: string;
  }>;
  notes: {
    history: string;
    geminiQuota: string;
    groqQuota: string;
    cloudflareQuota: string;
    openRouterQuota: string;
  };
};

const number = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';
const dateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'No activity yet';

function ProgressBar({ remaining, limit }: { remaining: number | null; limit: number | null }) {
  if (remaining === null || limit === null || limit <= 0) {
    return <div className="text-xs text-slate-500">Quota not exposed by provider</div>;
  }
  const percentage = Math.max(0, Math.min(100, (remaining / limit) * 100));
  return (
    <div className="mt-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: percentage + '%' }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{number(remaining)} remaining</span>
        <span>{number(limit)} total</span>
      </div>
    </div>
  );
}

export default function AdminAiUsageMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch('/api/admin/ai-usage', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not load AI usage.');
      setData(payload);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI usage.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950/80 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 px-5 py-5 sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Activity className="h-4 w-4" /> AI Observability
          </div>
          <h3 className="text-xl font-bold text-white">AI Usage Monitor</h3>
          <p className="mt-1 text-xs text-slate-400">Provider health, model responses, failures and quota snapshots</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/60 hover:text-emerald-200 disabled:opacity-50"
        >
          <RefreshCw className={'h-3.5 w-3.5 ' + (refreshing ? 'animate-spin' : '')} />
          Refresh
        </button>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loading && !data ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading AI usage data…</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Successful provider responses today</div>
                <div className="mt-2 text-3xl font-extrabold text-white">{number(data.summary.successfulProviderResponsesToday)}</div>
                <div className="mt-1 text-[11px] text-slate-400">Bangladesh time (Asia/Dhaka)</div>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4">
                <div className="flex items-center gap-2 text-xs text-rose-200"><AlertCircle className="h-4 w-4" /> Failed provider attempts today</div>
                <div className="mt-2 text-3xl font-extrabold text-white">{number(data.summary.failedProviderAttemptsToday)}</div>
                <div className="mt-1 text-[11px] text-slate-400">Includes fallback attempts</div>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4">
                <div className="flex items-center gap-2 text-xs text-sky-200"><Gauge className="h-4 w-4" /> Total provider attempts today</div>
                <div className="mt-2 text-3xl font-extrabold text-white">{number(data.summary.totalProviderAttemptsToday)}</div>
                <div className="mt-1 text-[11px] text-slate-400">One user question may trigger multiple attempts</div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Cpu className="h-4 w-4 text-emerald-300" /> Provider status & quota
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {data.providers.map((provider) => {
                  const openDaily = provider.id === 'openrouter' ? provider.quota?.daily : null;
                  const groqDaily = provider.id === 'groq' ? provider.quota?.requestsPerDay : null;
                  const remaining = openDaily?.remaining ?? groqDaily?.remaining ?? null;
                  const limit = openDaily?.limit ?? groqDaily?.limit ?? null;
                  return (
                    <article key={provider.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white">{provider.name}</div>
                          <div className="mt-1 break-all text-[11px] text-slate-400">{provider.model}</div>
                        </div>
                        <span className={'shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ' +
                          (provider.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400')}>
                          {provider.enabled ? 'Enabled' : provider.keyConfigured ? 'Paused' : 'No API key'}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-4 text-xs">
                        <span className="text-emerald-300">{number(provider.today.success)} successful</span>
                        <span className="text-rose-300">{number(provider.today.failed)} failed</span>
                      </div>
                      {provider.id === 'openrouter' ? (
                        <>
                          {provider.quota?.daily ? <ProgressBar remaining={remaining} limit={limit} /> : (
                            <div className="mt-3 text-xs text-slate-500">{data.openRouterQuotaError || 'Free-model quota unavailable'}</div>
                          )}
                          {provider.quota?.isFreeTier !== null && provider.quota?.isFreeTier !== undefined && (
                            <div className="mt-2 text-[11px] text-slate-500">
                              Account tier: {provider.quota.isFreeTier ? 'Free tier' : 'Has purchased credits'}
                            </div>
                          )}
                          {provider.quota?.creditRemaining !== null && provider.quota?.creditRemaining !== undefined && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              Key credit remaining: {'$'}{Number(provider.quota.creditRemaining).toFixed(2)}
                            </div>
                          )}
                        </>
                      ) : provider.id === 'groq' ? (
                        <>
                          <ProgressBar remaining={remaining} limit={limit} />
                          {provider.quota?.tokensPerMinute && (
                            <div className="mt-2 text-[11px] text-slate-500">
                              Tokens/minute: {number(provider.quota.tokensPerMinute.remaining)} / {number(provider.quota.tokensPerMinute.limit)}
                            </div>
                          )}
                          {provider.quota?.capturedAt && (
                            <div className="mt-1 text-[10px] text-slate-600">Last quota header: {dateTime(provider.quota.capturedAt)}</div>
                          )}
                        </>
                      ) : provider.id === 'cloudflare' ? (
                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
                          {provider.quota?.allowance || 'Cloudflare free allocation is account-specific.'} Exact remaining Neurons are not returned by inference responses; check the Cloudflare AI usage dashboard.
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
                          Exact remaining quota is not exposed by the standard Gemini response API. Website usage is tracked here; check Google AI Studio for the account cap.
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
                <div className="text-sm font-bold text-white">Model performance · Last 30 days</div>
                <div className="text-[10px] text-slate-500">Successful responses vs failed attempts</div>
              </div>
              {data.models.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Provider / Model</th>
                        <th className="px-4 py-3 text-right">Responses</th>
                        <th className="px-4 py-3 text-right">Failures</th>
                        <th className="px-4 py-3 text-right">Avg. latency</th>
                        <th className="px-4 py-3">Last used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {data.models.map((item) => (
                        <tr key={item.provider + item.model} className="text-slate-300">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{item.model}</div>
                            <div className="mt-0.5 capitalize text-[10px] text-slate-500">{item.provider}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-300">{number(item.success)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-300">{number(item.failed)}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.avgLatencyMs === null ? '—' : number(item.avgLatencyMs) + ' ms'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{dateTime(item.lastUsedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No provider telemetry has been recorded yet. Data will appear after the next AI request.
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldAlert className="h-4 w-4 text-rose-300" /> Recent provider failures</div>
                <span className="text-[10px] text-slate-500">Last 30 days · newest first</span>
              </div>
              {data.recentFailures.length ? (
                <div className="divide-y divide-slate-800">
                  {data.recentFailures.map((failure) => (
                    <div key={failure.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                      <div className="min-w-0">
                        <div className="break-all font-semibold text-white">{failure.provider} · {failure.model}</div>
                        <div className="mt-1 text-rose-300">
                          {failure.errorMessage || 'Provider request failed'}
                          {failure.statusCode ? ' · HTTP ' + failure.statusCode : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-slate-500">
                        <div>{dateTime(failure.createdAt)}</div>
                        {failure.latencyMs !== null && <div>{number(failure.latencyMs)} ms · attempt {failure.attempt}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-emerald-300">No provider failures recorded in the last 30 days.</div>
              )}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-[11px] leading-relaxed text-slate-400">
              <div className="flex items-center gap-2 font-semibold text-slate-300"><CircleHelp className="h-3.5 w-3.5" /> Measurement notes</div>
              <p>{data.notes.history}</p>
              <p>{data.notes.openRouterQuota}</p>
              <p>{data.notes.groqQuota}</p>
              <p>{data.notes.cloudflareQuota}</p>
              <p>{data.notes.geminiQuota}</p>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
              <span>Auto-refreshes every 60 seconds</span>
              <span>Updated: {dateTime(data.generatedAt)}</span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
