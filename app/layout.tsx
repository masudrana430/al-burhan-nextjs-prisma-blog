import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AL-BURHAN | Research & Knowledge Library',
  description: 'বাংলা ও English-এ research, articles এবং knowledge library।',
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
