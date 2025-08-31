

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, CoinAnimationProvider } from '@/contexts/auth-context';
import PageLayout from '@/components/layout/page-layout';
import { SoundProvider } from '@/contexts/sound-context';
import BackgroundMusicPlayer from '@/components/layout/background-music-player';
import SplashScreen from '@/components/layout/splash-screen';
import AnimatedCoin from '@/components/rewards/animated-coin';
import { QueryProvider } from '@/components/layout/query-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HousieHub',
  description: 'Play Housie (Tambola/Bingo) online with friends and family!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <SplashScreen />
        <SoundProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
            <AuthProvider>
              <QueryProvider>
                <CoinAnimationProvider>
                  <PageLayout>{children}</PageLayout>
                  <BackgroundMusicPlayer />
                </CoinAnimationProvider>
              </QueryProvider>
            </AuthProvider>
            </ThemeProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
