import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import AdminQuranTafsirImporter from '@/components/admin-quran-tafsir-importer';

export const dynamic = 'force-dynamic';

export default async function AdminQuranTafsirPage() {
  const session = await getServerSession(authOptions);
  const user = (session as { user?: { role?: string } } | null)?.user;
  if (user?.role !== 'ADMIN') redirect('/login');

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-10 text-[#202124] dark:bg-[#0b1220] dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/?view=admin" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
          ← Back to Admin Dashboard
        </Link>
        <div className="mt-6">
          <AdminQuranTafsirImporter />
        </div>
      </div>
    </main>
  );
}
