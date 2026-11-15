'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google))).catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn('user-credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setError('ইমেইল OR Password সঠিক নয়।');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('এই মুহূর্তে লগইন করা যাচ্ছে না। আবার চেষ্টা করুন।');
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
          <div><p className="text-xs uppercase tracking-widest auth-muted">গবেষণা পাঠাগার</p><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1></div>
        </div>
        <p className="auth-muted text-sm mb-6">আপনার AL-BURHAN account-এ sign in করুন।</p>
        {error && <p role="alert" className="auth-error rounded-xl px-3 py-2.5 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">Email address
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><Mail size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <label className="block text-sm font-medium">পাসওয়ার্ড
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={17}/><input required type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="আপনার পাসওয়ার্ড" className="w-full py-3 bg-transparent outline-none"/><button type="button" aria-label={showPassword?'পাসওয়ার্ড লুকান':'পাসওয়ার্ড দেখুন'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
          </label>
          <button disabled={loading} className="auth-primary w-full rounded-xl py-3 font-semibold disabled:opacity-60">{loading?'Signing in…':'Sign in'}</button>
        </form>
        {googleEnabled && <>
          <div className="auth-divider flex items-center gap-3 my-5"><span className="h-px flex-1"/><span className="text-xs auth-muted">অথবা</span><span className="h-px flex-1"/></div>
          <button type="button" onClick={()=>signIn('google',{callbackUrl:'/'})} className="auth-google w-full rounded-xl border py-3 font-medium flex items-center justify-center gap-3"><GoogleMark/> Continue with Google</button>
        </>}
        <p className="text-sm text-center auth-muted mt-6">AL-BURHAN-এ নতুন? <Link className="auth-link font-semibold" href="/register">Create account</Link></p>
        <div className="auth-admin mt-6 pt-5 border-t text-xs auth-muted">Admin? <Link href="/" className="auth-link font-semibold">Go to Home and choose Admin Login</Link></div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44Z"/><path fill="#4A90E2" d="M12.8 27.8a12 12 0 0 1 0-7.6v-5.3H5.9a20 20 0 0 0 0 18.2l6.9-5.3Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 14.9l6.9 5.3C14.4 15.6 18.8 12.1 24 12.1Z"/></svg>;
}
