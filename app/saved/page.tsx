import type { Metadata } from 'next';
import { ArticleThemeShell } from '@/components/article-theme-shell';
import { SavedArticlesPage } from '@/components/saved-articles-page';

export const metadata: Metadata = {
  title: 'Saved Articles',
  description: 'আপনার AL-BURHAN-এর সংরক্ষিত গবেষণা ও প্রবন্ধের ব্যক্তিগত পাঠাগার।',
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <ArticleThemeShell>
      <SavedArticlesPage />
    </ArticleThemeShell>
  );
}
