import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HomeBridge Korea',
  description: 'AI-powered housing decision support for foreigners in Korea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
