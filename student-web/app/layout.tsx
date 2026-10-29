import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const sarabun = localFont({
  src: [
    { path: './fonts/Sarabun-Light.ttf', weight: '300', style: 'normal' },
    { path: './fonts/Sarabun-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Sarabun-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CourseChic Student',
  description: 'Student learning workspace for CourseChic',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>{children}</body>
    </html>
  );
}
