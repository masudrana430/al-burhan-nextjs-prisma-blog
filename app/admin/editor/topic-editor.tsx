'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Eye, FileText, FolderPlus, Loader2, Plus, Send, Trash2 } from 'lucide-react';

type Topic = { id: string; name: string; description: string; postCount: number };
type Props = { initialTopics: Topic[] };

const field = 'w-full rounded-xl border border-[#dfe3e8] bg-white px-4 py-3 text-[15px] text-[#202124] outline-none transition focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#1a73e8]/10 placeholder:text-[#9aa0a6]';
const label = 'mb-2 block text-sm font-semibold text-[#3c4043]';

export default function TopicEditor({ initialTopics }: Props) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [claim, setClaim] = useState('');
  const [content, setContent] = useState('');
  const [topicId, setTopicId] = useState(initialTopics[0]?.id || '');
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [topicBusy, setTopicBusy] = useState(false);

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const readTime = Math.max(1, Math.ceil(wordCount / 180));

  async function createTopic(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setTopicBusy(true);
    try {
      const response = await fetch('/api/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopic, description: newDescription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'বিষয় তৈরি করা যায়নি।');
      const topic = { id: data.topic.id, name: data.topic.name, description: data.topic.description || '', postCount: 0 };
      setTopics(current => [...current, topic]);
      setTopicId(topic.id);
      setNewTopic('');
      setNewDescription('');
      setMessage('নতুন বিষয়টি তৈরি হয়েছে।');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'সমস্যা হয়েছে।');
    } finally {
      setTopicBusy(false);
    }
  }

  async function deleteTopic(id: string) {
    const response = await fetch('/api/topics?id=' + encodeURIComponent(id), { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'বিষয়টি মুছে ফেলা যায়নি।'); return; }
    const remaining = topics.filter(topic => topic.id !== id);
    setTopics(remaining);
    if (topicId === id) setTopicId(remaining[0]?.id || '');
    setMessage('বিষয়টি মুছে ফেলা হয়েছে।');
  }

  async function savePost(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!title.trim() || !content.trim() || !topicId) {
      setMessage('শিরোনাম, মূল লেখা এবং একটি বিষয় নির্বাচন করুন।');
      return;
    }
    setSaving(true);
    try {
      const tagsList = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const response = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), slug: title.trim(), excerpt: summary.trim(),
          claimAddressed: claim.trim(), content: content.trim(), topicId,
          category: 'PHILOSOPHY_LOGIC', difficulty, tags: tagsList,
          keyTakeaways: [], references: [], readTimeMinutes: readTime,
          featured, published,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'পোস্ট সংরক্ষণ করা যায়নি।');
      setMessage(published ? 'পোস্ট সফলভাবে প্রকাশিত হয়েছে।' : 'খসড়াটি সংরক্ষণ করা হয়েছে।');
      router.push('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'পোস্ট সংরক্ষণ করা যায়নি।');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-editor-bn min-h-screen bg-[#f7f8fa] text-[#202124]">
      <header className="sticky top-0 z-20 border-b border-[#e8eaed] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="হোমে ফিরুন" className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"><ArrowLeft size={20}/></Link>
            <div className="min-w-0"><p className="text-xs text-[#80868b]">আল-বুরহান · প্রশাসক</p><h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">নতুন পোস্ট তৈরি করুন</h1></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setPreview(value => !value)} className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] px-3 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#f8f9fa]"><Eye size={16}/><span className="hidden sm:inline">{preview ? 'এডিটর' : 'প্রিভিউ'}</span></button>
            <button form="post-editor" type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1765cc] disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}<span>{published ? 'প্রকাশ করুন' : 'খসড়া সংরক্ষণ'}</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-9">
        <section className="min-w-0">
          <form id="post-editor" onSubmit={savePost} className="space-y-5">
            <div className="rounded-2xl border border-[#e4e8ed] bg-white p-5 shadow-[0_1px_3px_rgba(60,64,67,.05)] sm:p-7">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#5f6368]"><FileText size={17}/> পোস্টের মূল তথ্য</div>
              {!preview ? <>
                <label className={label}>পোস্টের শিরোনাম <span className="text-red-500">*</span></label>
                <input className={field + ' mb-5 text-lg font-semibold'} value={title} onChange={event => setTitle(event.target.value)} placeholder="আপনার পোস্টের শিরোনাম লিখুন" maxLength={220} required/>
                <label className={label}>সংক্ষিপ্ত পরিচিতি</label>
                <textarea className={field + ' mb-5 min-h-24 resize-y'} value={summary} onChange={event => setSummary(event.target.value)} placeholder="পাঠক এই পোস্টে কী জানতে পারবেন, সংক্ষেপে লিখুন…"/>
                <label className={label}>যে প্রশ্ন বা বিষয়টি আলোচনা করবেন</label>
                <input className={field + ' mb-5'} value={claim} onChange={event => setClaim(event.target.value)} placeholder="প্রশ্ন, সমস্যা বা আলোচ্য বিষয় (ঐচ্ছিক)"/>
                <div className="mb-2 flex items-center justify-between gap-2"><label className={label + ' mb-0'}>মূল লেখা <span className="text-red-500">*</span></label><span className="text-xs text-[#80868b]">{wordCount.toLocaleString('bn-BD')} শব্দ · প্রায় {readTime.toLocaleString('bn-BD')} মিনিট</span></div>
                <textarea className={field + ' min-h-[420px] resize-y leading-8'} value={content} onChange={event => setContent(event.target.value)} placeholder={'আপনার লেখা এখানে লিখুন…\n\nশিরোনাম দিতে চাইলে # ব্যবহার করতে পারেন।\n\nপ্রতিটি অনুচ্ছেদের মাঝে একটি খালি লাইন রাখুন।'} required/>
                <p className="mt-2 text-xs leading-6 text-[#80868b]">পরামর্শ: লেখা সাজাতে Markdown ব্যবহার করতে পারেন—# শিরোনাম, **গুরুত্বপূর্ণ লেখা**, - তালিকা।</p>
              </> : <article className="max-w-none">
                <p className="mb-2 text-sm text-[#80868b]">{topics.find(topic => topic.id === topicId)?.name || 'বিষয় নির্বাচন করুন'}</p>
                <h2 className="text-3xl font-bold leading-tight">{title || 'পোস্টের শিরোনাম'}</h2>
                {summary && <p className="text-lg text-[#5f6368]">{summary}</p>}
                {claim && <blockquote className="my-5 border-l-4 border-[#8ab4f8] pl-4 text-[#5f6368]">{claim}</blockquote>}
                <div className="whitespace-pre-wrap leading-8">{content || 'আপনার লেখা এখানে দেখা যাবে।'}</div>
              </article>}
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-[#e4e8ed] bg-white p-5 shadow-[0_1px_3px_rgba(60,64,67,.05)] sm:p-7">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#5f6368]"><FolderPlus size={17}/> নতুন বিষয় বা ক্যাটাগরি তৈরি</div>
            <form onSubmit={createTopic} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input className={field} value={newTopic} onChange={event => setNewTopic(event.target.value)} placeholder="যেমন: বিজ্ঞান ও প্রযুক্তি" minLength={2} maxLength={60} required/>
              <input className={field} value={newDescription} onChange={event => setNewDescription(event.target.value)} placeholder="বিষয়ের সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)" maxLength={500}/>
              <button disabled={topicBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8f0fe] px-4 py-3 text-sm font-semibold text-[#1967d2] hover:bg-[#dbe8fd] disabled:opacity-50"><Plus size={17}/> বিষয় যোগ</button>
            </form>
            <div className="mt-4 divide-y divide-[#f1f3f4]">
              {topics.map(topic => <div key={topic.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{topic.name}</p><p className="text-xs text-[#80868b]">{topic.postCount.toLocaleString('bn-BD')}টি পোস্ট {topic.description ? '· ' + topic.description : ''}</p></div>
                <button type="button" disabled={topic.postCount > 0} onClick={() => deleteTopic(topic.id)} title={topic.postCount ? 'এই বিষয়ে পোস্ট আছে' : 'বিষয় মুছুন'} className="rounded-lg p-2 text-[#80868b] hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={16}/></button>
              </div>)}
              {!topics.length && <p className="py-4 text-sm text-[#80868b]">এখনো কোনো বিষয় তৈরি করা হয়নি।</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[#e4e8ed] bg-white p-5 shadow-[0_1px_3px_rgba(60,64,67,.05)]">
            <h2 className="mb-4 text-sm font-semibold text-[#3c4043]">পোস্ট সেটিংস</h2>
            <label className={label}>বিষয় / ক্যাটাগরি</label>
            <select className={field + ' mb-4'} value={topicId} onChange={event => setTopicId(event.target.value)} required>
              <option value="">বিষয় নির্বাচন করুন</option>
              {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
            <label className={label}>কঠিনতার স্তর</label>
            <select className={field + ' mb-4'} value={difficulty} onChange={event => setDifficulty(event.target.value)}>
              <option value="BEGINNER">প্রাথমিক</option><option value="INTERMEDIATE">মধ্যবর্তী</option><option value="ADVANCED">উন্নত</option>
            </select>
            <label className={label}>ট্যাগ (কমা দিয়ে আলাদা করুন)</label>
            <input className={field + ' mb-4'} value={tags} onChange={event => setTags(event.target.value)} placeholder="বিজ্ঞান, দর্শন, গবেষণা"/>
            <label className="mb-4 flex items-center gap-3 text-sm text-[#3c4043]"><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)} className="h-4 w-4 accent-[#1a73e8]"/> গুরুত্বপূর্ণ পোস্ট হিসেবে দেখান</label>
            <label className="mb-4 flex items-center gap-3 text-sm text-[#3c4043]"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} className="h-4 w-4 accent-[#1a73e8]"/> এখনই প্রকাশ করুন</label>
            <div className="rounded-xl bg-[#f8f9fa] p-3 text-xs leading-6 text-[#5f6368]"><p>শব্দসংখ্যা: {wordCount.toLocaleString('bn-BD')}</p><p>পড়তে সময়: প্রায় {readTime.toLocaleString('bn-BD')} মিনিট</p><p>ট্যাগ: {tags.split(',').filter(tag => tag.trim()).length.toLocaleString('bn-BD')}টি</p></div>
          </div>
          {message && <div role="status" className="rounded-xl border border-[#d2e3fc] bg-[#e8f0fe] p-4 text-sm leading-6 text-[#174ea6]">{message}</div>}
          <div className="rounded-2xl border border-[#e4e8ed] bg-white p-5 text-sm leading-7 text-[#5f6368]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#3c4043]"><BookOpen size={17}/> লেখার টিপস</div>
            <p>একটি স্পষ্ট শিরোনাম দিন, ছোট অনুচ্ছেদে লিখুন এবং তথ্যসূত্র উল্লেখ করুন। বাংলা ও ইংরেজি—দুই ভাষার লেখাই সংরক্ষণ করা যাবে।</p>
            <p className="mt-2">প্রয়োজনে Markdown ব্যবহার করুন। পরবর্তীতে সমৃদ্ধ Text Editor, ছবি, ভিডিও ও সূত্র যোগ করার সুবিধা যুক্ত করা যাবে।</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
