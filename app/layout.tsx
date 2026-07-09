import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'Course E-Attendance',
  description: 'Professional Attendance Management for Courses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans min-h-screen">
        <AppProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AppProvider>
      </body>
    </html>
  );
}
