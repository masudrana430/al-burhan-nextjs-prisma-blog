'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Database, ExternalLink, FileJson, RefreshCw, UploadCloud } from 'lucide-react';

type SourceStatus = {
  slug: string;
  title: string;
  author: string;
  sourceVersion: string | null;
  importedGroups: number;
  coveredAyahs: number;
  datasetSha256: string | null;
  isActive: boolean;
  licenseReviewedAt: string | null;
  importedAt: string | null;
  storedPassages: number;
  sourceUrl: string;
};

type StatusPayload = { configured: boolean; source: SourceStatus | null };

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminQuranTafsirImporter() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceVersion, setSourceVersion] = useState('');
  const [licenseReviewed, setLicenseReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/quran-tafsir', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not load Tafsir database status.');
      setStatus(payload);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Tafsir database status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('প্রথমে QUL থেকে ডাউনলোড করা JSON বা .json.gz ফাইল নির্বাচন করুন।');
      return;
    }
    if (!licenseReviewed) {
      setError('ডেটাসেটের নির্দিষ্ট লাইসেন্স/শর্ত যাচাই করে অনুমতি নিশ্চিত করুন।');
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('licenseReviewed', 'true');
      form.set('sourceVersion', sourceVersion);
      const response = await fetch('/api/admin/quran-tafsir/import', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'QUL import failed.');
      setSuccess(
        'Import successful: ' + Number(payload.importedGroups).toLocaleString() +
        ' Tafsir passages covering ' + Number(payload.coveredAyahs).toLocaleString() + ' ayahs.'
      );
      setFile(null);
      setLicenseReviewed(false);
      const input = document.getElementById('qul-tafsir-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QUL import failed.');
    } finally {
      setBusy(false);
    }
  }

  const source = status?.source;

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-900/15 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-6 dark:border-slate-700 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Al-Burhan · Quran Knowledge</div>
            <h1 className="mt-1 text-2xl font-bold">Qur'an Tafsir Database</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">QUL resource #33 · Tafsir Abu Bakr Zakaria · Bengali</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-500"><Database className="h-4 w-4" /> Database status</div>
            <div className="mt-2 text-lg font-bold">{loading ? 'Checking…' : status?.configured ? 'Imported & active' : 'Not imported'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="text-xs text-slate-500">Tafsir passage groups</div>
            <div className="mt-2 text-2xl font-extrabold">{source ? source.storedPassages.toLocaleString() : '—'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="text-xs text-slate-500">Ayahs covered</div>
            <div className="mt-2 text-2xl font-extrabold">{source ? source.coveredAyahs.toLocaleString() : '—'}</div>
          </div>
        </div>

        {source && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Current QUL dataset</div>
            <div className="mt-2 grid gap-2 text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <div>Version: <strong>{source.sourceVersion || 'Not specified'}</strong></div>
              <div>Imported: <strong>{formatDate(source.importedAt)}</strong></div>
              <div>License review recorded: <strong>{formatDate(source.licenseReviewedAt)}</strong></div>
              <div>Stored records: <strong>{source.storedPassages.toLocaleString()}</strong></div>
            </div>
            {source.datasetSha256 && <div className="mt-2 break-all text-[10px] text-slate-500">SHA-256: {source.datasetSha256}</div>}
          </div>
        )}

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {success && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

        <div className="space-y-3">
          <h2 className="text-lg font-bold">Import the QUL JSON dataset</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>Open QUL resource #33 and download its <strong>JSON</strong> export.</li>
            <li>For files above 3.8 MB, compress the JSON as a <strong>.json.gz</strong> file before uploading.</li>
            <li>Review the licence/attribution terms for this exact resource and make sure your intended display and storage are permitted.</li>
          </ol>
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="block text-sm font-semibold">
              QUL JSON file
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 font-normal dark:border-slate-600 dark:bg-slate-950">
                <FileJson className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                <input
                  id="qul-tafsir-file"
                  type="file"
                  accept=".json,.gz,application/json,application/gzip"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="min-w-0 flex-1 text-xs"
                />
              </span>
              {file && <span className="mt-1 block text-xs font-normal text-slate-500">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
            </label>

            <label className="block text-sm font-semibold">
              Dataset version (optional)
              <input
                value={sourceVersion}
                onChange={(event) => setSourceVersion(event.target.value)}
                placeholder="e.g. QUL export downloaded on 2026-11-20"
                maxLength={120}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-950"
              />
            </label>

            <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={licenseReviewed}
                onChange={(event) => setLicenseReviewed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>I have checked the licence/terms for this specific QUL resource and confirm that I am authorised to store and display this dataset on Al-Burhan.</span>
            </label>
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              QUL says licence terms can differ by resource. This checkbox records your attestation only; it does not grant permission or change the dataset's licence. Do not upload unless you have the necessary rights.
            </p>

            <button
              type="submit"
              disabled={busy || !file || !licenseReviewed}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy ? 'Importing and indexing…' : 'Import into PostgreSQL'}
            </button>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <a href="https://qul.tarteel.ai/resources/translation/33" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-emerald-500 dark:border-slate-700">
            QUL · Primary Tafsir source <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
          <a href="https://quranenc.com/bn/home/api" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-emerald-500 dark:border-slate-700">
            QuranEnc · Translation cross-check <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
          <a href="https://quran.com" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-emerald-500 dark:border-slate-700">
            Quran.com · External verification <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        </div>
      </div>
    </section>
  );
}
