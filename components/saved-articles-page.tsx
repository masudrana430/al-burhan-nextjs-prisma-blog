'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Bookmark, BookOpen, Clock, Trash2 } from 'lucide-react';
import { getSavedArticleIds, migrateLegacySavedArticles, setSavedArticle } from '@/lib/saved-articles';

type SavedArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  createdAt: string;
};

const categoryLabels: Record<string, string> = {
  COSMOLOGY_PHYSICS: 'মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান',
  BIOLOGY_EMBRYOLOGY: 'জীববিজ্ঞান ও ভ্রূণতত্ত্ব',
  HISTORICAL_ETHICS: 'ইতিহাস ও নৈতিকতা',
  PHILOSOPHY_LOGIC: 'দর্শন ও যুক্তিবিদ্যা',
  LINGUISTICS_TAFSIR: 'ভাষাতত্ত্ব ও তাফসির',
};

export function SavedArticlesPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    const loadSavedArticles = async () => {
      setLoading(true);
      setLoadError('');
      const ids = migrateLegacySavedArticles();
      if (!active) return;
      setSavedIds(ids);

      if (ids.length === 0) {
        setArticles([]);
        setLoading(false);
        return;
      }

      try {
        const allPosts: Record<string, unknown>[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await fetch(`/api/posts?page=${page}&pageSize=20`, { cache: 'no-store' });
          if (!response.ok) throw new Error('পাঠাগারের প্রবন্ধগুলো লোড করা যায়নি।');
          const data = await response.json() as {
            posts?: Record<string, unknown>[];
            pagination?: { totalPages?: number };
          };
          if (Array.isArray(data.posts)) allPosts.push(...data.posts);
          totalPages = Math.max(1, Number(data.pagination?.totalPages) || 1);
          page += 1;
        } while (page <= totalPages && page <= 100);

        if (!active) return;
        const idSet = new Set(ids);
        const matching = allPosts
          .filter((post) => typeof post.id === 'string' && idSet.has(post.id))
          .map((post) => ({
            id: String(post.id),
            title: String(post.title || 'Untitled article'),
            slug: String(post.slug || post.id),
            excerpt: String(post.excerpt || ''),
            category: String(
              (post.topic && typeof post.topic === 'object' && 'name' in post.topic
                ? post.topic.name
                : null) || categoryLabels[String(post.category)] || post.category || 'অন্যান্য'
            ),
            tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === 'string') : [],
            readTimeMinutes: Number(post.readTimeMinutes) || 5,
            createdAt: String(post.createdAt || ''),
          }));
        setArticles(matching);
      } catch (error) {
        // Fall back to the previous browser cache while the API is unavailable.
        try {
          const cached: unknown = JSON.parse(window.localStorage.getItem('al_burhan_posts_v2') || '[]');
          if (active && Array.isArray(cached)) {
            const idSet = new Set(ids);
            setArticles(cached.filter((post): post is SavedArticle =>
              Boolean(post && typeof post === 'object' && 'id' in post && typeof post.id === 'string' && idSet.has(post.id))
            ));
          }
        } catch {
          if (active) setArticles([]);
        }
        if (active) setLoadError(error instanceof Error ? error.message : 'প্রবন্ধ লোড করা যায়নি।');
      } finally {
        if (active) setLoading(false);
      }
    };

    const refresh = () => { void loadSavedArticles(); };
    void loadSavedArticles();
    window.addEventListener('storage', refresh);
    window.addEventListener('al-burhan:saved-articles-changed', refresh);

    return () => {
      active = false;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('al-burhan:saved-articles-changed', refresh);
    };
  }, []);

  function removeSavedArticle(id: string) {
    const nextIds = setSavedArticle(id, false);
    setSavedIds(nextIds);
    setArticles((current) => current.filter((article) => article.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <Link href="/" className="flex items-center gap-3" aria-label="AL-BURHAN homepage">
            <Image src="/al-burhan-logo.svg" alt="AL-BURHAN logo" width={52} height={52} unoptimized className="h-12 w-12 rounded-xl object-cover" />
            <span>
              <strong className="block text-lg tracking-wide">AL-BURHAN</strong>
              <small className="text-xs text-slate-500">Your Saved Research Library</small>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-white">
            <ArrowLeft size={16} /> Back to Articles
          </Link>
        </header>

        <section className="mb-7">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
            <Bookmark size={16} /> Personal Library
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Saved Articles</h1>
              <p className="mt-2 max-w-2xl leading-7 text-slate-600">আপনার সংরক্ষিত গবেষণা ও প্রবন্ধগুলো এখানে একসঙ্গে পাবেন।</p>
            </div>
            <span className="rounded-full border border-emerald-900/15 bg-white px-4 py-2 text-sm font-semibold text-emerald-900">
              {savedIds.length} saved
            </span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-slate-600">Saved articles লোড হচ্ছে…</div>
        ) : articles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {articles.map((article) => (
              <article key={article.id} className="flex min-h-56 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-800">{article.category}</p>
                  <h2 className="text-xl font-bold leading-snug text-slate-900">
                    <Link href={`/articles/${encodeURIComponent(article.slug)}`} className="hover:text-emerald-800 hover:underline">{article.title}</Link>
                  </h2>
                  {article.excerpt ? <p className="mt-3 line-clamp-3 leading-7 text-slate-600">{article.excerpt}</p> : null}
                  {article.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {article.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-600">#{tag}</span>)}
                    </div>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Clock size={15} /> {article.readTimeMinutes} min read</span>
                  <button type="button" onClick={() => removeSavedArticle(article.id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-rose-700 hover:bg-rose-50" aria-label={`Remove ${article.title} from saved articles`}>
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><BookOpen size={26} /></span>
            <h2 className="text-xl font-bold text-slate-900">আপনার Saved Articles এখনো খালি</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">কোনো প্রবন্ধের পাশে Bookmark চাপুন অথবা প্রবন্ধের ভেতর থেকে “Save Article” নির্বাচন করুন। সংরক্ষিত প্রবন্ধগুলো এই route-এ দেখা যাবে।</p>
            {loadError ? <p className="mt-3 text-sm text-amber-700">{loadError}</p> : null}
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Browse Articles <ArrowLeft size={15} className="rotate-180" /></Link>
          </div>
        )}
      </div>
    </main>
  );
}
