'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { getSavedArticleIds, setSavedArticle } from '@/lib/saved-articles';

export function ArticleBookmarkActions({ postId }: { postId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(getSavedArticleIds().includes(postId));
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('al-burhan:saved-articles-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('al-burhan:saved-articles-changed', sync);
    };
  }, [postId]);

  function toggleSaved() {
    const next = !getSavedArticleIds().includes(postId);
    setSavedArticle(postId, next);
    setSaved(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
          saved
            ? 'border-amber-400/60 bg-amber-50 text-amber-900 hover:bg-amber-100'
            : 'border-emerald-800/20 bg-emerald-900 text-white hover:bg-emerald-800'
        }`}
      >
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        <span>{saved ? 'সংরক্ষিত' : 'Save Article'}</span>
      </button>
      <Link
        href="/saved"
        className="rounded-full border border-stone-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-white"
      >
        Saved Articles
      </Link>
    </div>
  );
}
