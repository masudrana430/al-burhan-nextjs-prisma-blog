import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About AL-BURHAN and Its Editor',
  description: 'AL-BURHAN-এর উদ্দেশ্য, গবেষণার ক্ষেত্র এবং প্রতিষ্ঠাতা ও সম্পাদকের পরিচিতি। বাংলা ও ইংরেজিতে জ্ঞান, যুক্তি এবং গবেষণাভিত্তিক পাঠাগার।',
  alternates: { canonical: siteUrl + '/about' },
  openGraph: {
    title: 'About AL-BURHAN',
    description: 'Meet the editor and learn about the AL-BURHAN research library.',
    url: siteUrl + '/about',
    type: 'profile',
    images: [{ url: siteUrl + '/al-burhan-logo.svg', alt: 'AL-BURHAN logo' }],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
