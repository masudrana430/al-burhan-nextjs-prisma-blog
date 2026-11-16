import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/site';
import { ArticleThemeShell } from '@/components/article-theme-shell';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };
type ContentBlock = { id?: string; type?: string; value?: string; caption?: string };
type Reference = { label?: string; citation?: string };

async function getArticle(identifier: string) {
  // Resolve both canonical slugs and immutable database IDs so cached links
  // continue to work without requiring a redirect through another URL.
  const post = await prisma.post.findFirst({
    where: { OR: [{ slug: identifier }, { id: identifier }] },
    include: { topic: true },
  });
  if (!post || !post.published) return null;
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticle(slug);
  if (!post) return { title: 'Article not found | AL-BURHAN', robots: { index: false, follow: false } };

  const canonical = siteUrl + '/articles/' + encodeURIComponent(post.slug);
  const description = (post.excerpt || post.claimAddressed || post.title).slice(0, 300);
  return {
    title: post.title,
    description,
    keywords: [...post.tags, post.category, 'AL-BURHAN', 'বাংলা গবেষণা', 'Islamic research'],
    alternates: { canonical },
    authors: [{ name: post.authorName || 'AL-BURHAN Editorial Team' }],
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: canonical,
      siteName: 'AL-BURHAN — The Proof Website',
      locale: 'bn_BD',
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.authorName || 'AL-BURHAN'],
      tags: post.tags,
      images: [{ url: siteUrl + '/al-burhan-logo.svg', alt: 'AL-BURHAN logo' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [siteUrl + '/al-burhan-logo.svg'],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  };
}

function renderText(value: string, prefix: string) {
  return value.split(/\n{2,}/).map((paragraph, index) => {
    const text = paragraph.trim();
    const key = prefix + '-' + index;
    if (!text) return null;
    if (text.startsWith('### ')) return <h2 key={key} className="mt-8 border-b border-stone-200 pb-2 text-xl font-bold text-slate-900">{text.slice(4)}</h2>;
    if (text.startsWith('#### ')) return <h3 key={key} className="mt-6 text-lg font-semibold text-slate-900">{text.slice(5)}</h3>;
    if (text.startsWith('> ')) return <blockquote key={key} className="border-l-4 border-amber-500 bg-amber-50 px-5 py-4 italic text-slate-700">{text.slice(2)}</blockquote>;
    const lines = text.split('\n');
    if (lines.every((line) => /^[-*]\s/.test(line))) return <ul key={key} className="list-disc space-y-2 pl-6 text-slate-700">{lines.map((line, i) => <li key={key + '-' + i}>{line.replace(/^[-*]\s/, '')}</li>)}</ul>;
    if (lines.every((line) => /^\d+[.)]\s/.test(line))) return <ol key={key} className="list-decimal space-y-2 pl-6 text-slate-700">{lines.map((line, i) => <li key={key + '-' + i}>{line.replace(/^\d+[.)]\s/, '')}</li>)}</ol>;
    return <p key={key} className="whitespace-pre-line text-base leading-8 text-slate-700">{text}</p>;
  });
}

function getYoutubeId(value: string) {
  const match = value.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || (/^[A-Za-z0-9_-]{11}$/.test(value) ? value : null);
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getArticle(slug);
  if (!post) notFound();

  const canonical = siteUrl + '/articles/' + encodeURIComponent(post.slug);
  const blocks = Array.isArray(post.blocks) ? post.blocks as ContentBlock[] : [];
  const references = Array.isArray(post.references) ? post.references as Reference[] : [];
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.authorName || 'AL-BURHAN Editorial Team' },
    publisher: { '@type': 'Organization', name: 'AL-BURHAN', logo: { '@type': 'ImageObject', url: siteUrl + '/al-burhan-logo.svg' } },
    mainEntityOfPage: canonical,
    image: siteUrl + '/al-burhan-logo.svg',
    keywords: post.tags.join(', '),
    articleSection: post.topic?.name || post.category,
    inLanguage: 'bn',
  };

  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-8 text-slate-900 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }} />
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <Link href="/" className="flex items-center gap-3" aria-label="AL-BURHAN homepage">
            <Image src="/al-burhan-logo.svg" alt="AL-BURHAN logo" width={56} height={56} unoptimized className="h-12 w-12 rounded-xl object-cover" />
            <span><strong className="block text-lg tracking-wide">AL-BURHAN</strong><small className="text-xs text-slate-500">The Proof Website</small></span>
          </Link>
          <Link href="/" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-white">প্রবন্ধ তালিকায় ফিরুন</Link>
        </header>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
          <header className="mb-8 border-b border-stone-100 pb-7">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">{post.topic?.name || post.category.replace(/_/g, ' ')}</p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
            {post.excerpt ? <p className="mt-5 text-lg leading-8 text-slate-600">{post.excerpt}</p> : null}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span>লেখক: {post.authorName || 'AL-BURHAN'}</span>
              <time dateTime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time>
              <span>{post.readTimeMinutes} মিনিট পাঠ</span>
            </div>
          </header>

          {post.claimAddressed ? <aside className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 p-5"><h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-800">যে আপত্তি / দাবির আলোচনা করা হয়েছে</h2><p className="leading-7 text-rose-950">{post.claimAddressed}</p></aside> : null}

          {post.keyTakeaways.length ? <section className="mb-9 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><h2 className="mb-3 font-bold text-emerald-950">মূল বিষয়গুলো</h2><ul className="list-disc space-y-2 pl-5 text-emerald-950">{post.keyTakeaways.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}

          <div className="space-y-6">
            {blocks.length ? blocks.map((block, index) => {
              const value = typeof block.value === 'string' ? block.value : '';
              if (block.type === 'image') {
                const safeSrc = /^(https?:\/\/|data:image\/)/i.test(value) ? value : '';
                return safeSrc ? <figure key={block.id || index} className="my-8"><img src={safeSrc} alt={block.caption || post.title} loading="lazy" className="mx-auto h-auto max-h-[560px] w-auto max-w-full rounded-xl object-contain" />{block.caption ? <figcaption className="mt-2 text-center text-sm text-slate-500">{block.caption}</figcaption> : null}</figure> : null;
              }
              if (block.type === 'youtube') {
                const id = getYoutubeId(value);
                return id ? <figure key={block.id || index} className="my-8"><div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe src={'https://www.youtube-nocookie.com/embed/' + id} title={block.caption || post.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="h-full w-full" /></div>{block.caption ? <figcaption className="mt-2 text-center text-sm text-slate-500">{block.caption}</figcaption> : null}</figure> : null;
              }
              if (block.type === 'quote') return <blockquote key={block.id || index} className="my-6 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-lg italic leading-8 text-slate-700"><p>{value}</p>{block.caption ? <cite className="mt-2 block text-sm not-italic text-slate-500">— {block.caption}</cite> : null}</blockquote>;
              return <section key={block.id || index} className="space-y-4">{renderText(value, 'block-' + index)}</section>;
            }) : renderText(post.content, 'content')}
          </div>

          {references.length ? <section className="mt-10 border-t border-stone-200 pt-7"><h2 className="mb-4 text-xl font-bold">তথ্যসূত্র ও উদ্ধৃতি</h2><ol className="list-decimal space-y-3 pl-6 text-sm leading-7 text-slate-700">{references.map((ref, index) => <li key={index}><strong>{ref.label || 'Reference'}:</strong> {ref.citation || ''}</li>)}</ol></section> : null}

          {post.tags.length ? <footer className="mt-9 border-t border-stone-200 pt-6"><h2 className="mb-3 text-sm font-bold text-slate-600">বিষয় / Tags</h2><ul className="flex flex-wrap gap-2">{post.tags.map((tag) => <li key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-slate-600">#{tag}</li>)}</ul></footer> : null}
        </article>
        <footer className="mt-8 text-center text-sm text-slate-500">© {new Date().getFullYear()} AL-BURHAN — গবেষণা, যুক্তি ও জ্ঞানচর্চা</footer>
      </div>
    </main>
  );
}
