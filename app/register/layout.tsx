import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create an AL-BURHAN reader account to save your reading and research activity.',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
