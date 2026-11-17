import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { siteUrl } from '@/lib/site';

const brandImage = siteUrl + '/opengraph-image';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AL-BURHAN — The Proof Website | Research & Knowledge Library',
    template: '%s | AL-BURHAN',
  },
  description: 'AL-BURHAN-এ পড়ুন বাংলা ও ইংরেজিতে ইসলামি গবেষণা, কুরআন ও বিজ্ঞান, দর্শন, ইতিহাস এবং যুক্তিনির্ভর প্রবন্ধ। নির্ভরযোগ্য সূত্র, বিশ্লেষণ ও গবেষণা উপকরণ এক জায়গায়।',
  applicationName: 'AL-BURHAN',
  keywords: [
    'AL-BURHAN', 'The Proof Website', 'Islamic research', 'Islamic apologetics', 'Quran and science',
    'Quranic studies', 'scientific verification', 'philosophy and logic', 'Bangla research articles',
    'ইসলামি গবেষণা', 'কুরআন ও বিজ্ঞান', 'বাংলা প্রবন্ধ', 'যুক্তি ও দলিল', 'ইসলামি জ্ঞানভান্ডার',
  ],
  authors: [{ name: 'Masud Rana' }],
  creator: 'Masud Rana',
  publisher: 'AL-BURHAN',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'AL-BURHAN — The Proof Website',
    title: 'AL-BURHAN — The Proof Website',
    description: 'ইসলামি গবেষণা, কুরআন ও বিজ্ঞান, দর্শন, ইতিহাস এবং যুক্তিনির্ভর বাংলা-ইংরেজি প্রবন্ধের পাঠাগার। সূত্র ও বিশ্লেষণসহ পড়ুন AL-BURHAN-এ।',
    locale: 'bn_BD',
    images: [{ url: brandImage, width: 1200, height: 630, alt: 'AL-BURHAN — The Proof Website logo and research library' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AL-BURHAN — The Proof Website',
    description: 'Islamic research, Quran and science, philosophy, history and evidence-based articles in Bangla and English.',
    images: [brandImage],
  },
  icons: { icon: [{ url: '/al-burhan-logo.svg', type: 'image/svg+xml' }], shortcut: ['/al-burhan-logo.svg'] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AL-BURHAN — The Proof Website',
  alternateName: 'AL-BURHAN Research & Knowledge Library',
  url: siteUrl,
  inLanguage: ['bn', 'en'],
  publisher: {
    '@type': 'Organization',
    name: 'AL-BURHAN',
    url: siteUrl,
    logo: { '@type': 'ImageObject', url: brandImage },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\\\u003c') }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
