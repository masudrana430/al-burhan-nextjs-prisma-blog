'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,email,password})
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Could not create your account.'); return; }
      const result = await signIn('user-credentials',{email,password,redirect:false});
      if (!result || result.error) { router.replace('/login?registered=1'); return; }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page min-h-screen flex items-center justify-center px-4 py-10">
      <section className="auth-panel w-full max-w-md rounded-3xl border p-6 sm:p-8">
        <Link href="/" className="auth-back inline-flex items-center gap-2 text-sm mb-8"><ArrowLeft size={16}/> Back to AL-BURHAN</Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="auth-logo h-12 w-12 rounded-2xl flex items-center justify-center"><BookOpen size={22}/></div>
          <div><p className="text-xs uppercase tracking-widest auth-muted">Research Library</p><h1 className="text-2xl font-semibold tracking-tight">Create account</h1></div>
        </div>
        <p className="auth-muted text-sm mb-6">Join AL-BURHAN to keep your reading experience connected.</p>
        {error && <p role="alert" className="auth-error rounded-xl px-3 py-2.5 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">Full name
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><UserRound size={17}/><input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <label className="block text-sm font-medium">Email address
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><Mail size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <label className="block text-sm font-medium">Password
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={17}/><input required minLength={10} maxLength={128} type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters" className="w-full py-3 bg-transparent outline-none"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
          </label>
          <label className="block text-sm font-medium">Confirm password
            <span className="auth-input-wrap mt-1.5 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={17}/><input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" className="w-full py-3 bg-transparent outline-none"/></span>
          </label>
          <button disabled={loading} className="auth-primary w-full rounded-xl py-3 font-semibold disabled:opacity-60">{loading?'Creating account…':'Create account'}</button>
        </form>
        <p className="text-sm text-center auth-muted mt-6">Already have an account? <Link className="auth-link font-semibold" href="/login">Sign in</Link></p>
        <p className="auth-terms text-xs auth-muted text-center mt-5">By creating an account, you agree to use this research library respectfully.</p>
      </section>
    </main>
  );
}
