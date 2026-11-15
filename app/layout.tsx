import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'আল-বুরহান | গবেষণা ও জ্ঞানভিত্তিক পাঠাগার',
  description: 'বাংলা ভাষায় গবেষণা, জ্ঞানচর্চা, প্রবন্ধ ও পাঠাগার।',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body className="bg-slate-50 text-slate-900 antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
