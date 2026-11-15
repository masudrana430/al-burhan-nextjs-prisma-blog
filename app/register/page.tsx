'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [showPassword,setShowPassword] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders().then(providers => setGoogleEnabled(Boolean(providers?.google))).catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirm) { setError('দুটি পাসওয়ার্ড মেলেনি.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,email,password})
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'অ্যাকাউন্ট তৈরি করা যায়নি।'); return; }
      const result = await signIn('user-credentials',{email,password,redirect:false});
      if (!result || result.error) { router.replace('/login?registered=1'); return; }
      router.replace('/');
      router.refresh();
    } catch {
      setError('নিবন্ধন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page min-h-screen flex items-center justify-center px-4 py-10">
      <section className="auth-panel w-full max-w-md rounded-3xl border p-6 sm:p-8">
        <Link href="/" className="auth-back inline-flex items-center gap-2 text-sm mb-8"><ArrowLeft size={16}/> আল-বুরহানে ফিরে যান</Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="auth-logo h-12 w-12 rounded-2xl flex items-center justify-center"><BookOpen size={22}/></div>
          <div><p className="text-xs uppercase tracking-widest auth-muted">গবেষণা পাঠাগার</p><h1 className="text-2xl font-semibold tracking-tight">অ্যাকাউন্ট তৈরি করুন</h1></div>
        </div>
        <p className="auth-muted text-sm mb-6">আপনার পাঠ ও গবেষণার অভিজ্ঞতা সংরক্ষণ করতে আল-বুরহানে যুক্ত হোন।</p>
        {googleEnabled && <button type="button" onClick={() => signIn('google', { callbackUrl: '/' })} className="auth-google w-full rounded-xl border py-3 font-medium mb-5">Google দিয়ে অ্যাকাউন্ট তৈরি করুন</button>}
        {error && <p role="alert" className="auth-error rounded-xl px-3 py-2.5 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">পূর্ণ নাম
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><UserRound size={17}/><input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="আপনার নাম" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <label className="block text-sm font-medium">ইমেইল ঠিকানা
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><Mail size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <label className="block text-sm font-medium">পাসওয়ার্ড
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={17}/><input required minLength={10} maxLength={128} type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="কমপক্ষে ১০ অক্ষর" className="w-full py-3 bg-transparent outline-none"/><button type="button" aria-label={showPassword?'পাসওয়ার্ড লুকান':'পাসওয়ার্ড দেখুন'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
          </label>
          <label className="block text-sm font-medium">পাসওয়ার্ড নিশ্চিত করুন
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={17}/><input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="আবার পাসওয়ার্ড লিখুন" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <button disabled={loading} className="auth-primary w-full rounded-xl py-3 font-semibold disabled:opacity-60">{loading?'অ্যাকাউন্ট তৈরি হচ্ছে…':'অ্যাকাউন্ট তৈরি করুন'}</button>
        </form>
        <p className="text-sm text-center auth-muted mt-6">আগে থেকেই অ্যাকাউন্ট আছে? <Link className="auth-link font-semibold" href="/login">লগইন করুন</Link></p>
        <p className="auth-terms text-xs auth-muted text-center mt-5">অ্যাকাউন্ট তৈরি করার মাধ্যমে আপনি এই গবেষণা পাঠাগার দায়িত্বশীলভাবে ব্যবহারে সম্মত হচ্ছেন।</p>
      </section>
    </main>
  );
}
