

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/contexts/auth-context';
import PageLayout from '@/components/layout/page-layout';
import { SoundProvider } from '@/contexts/sound-context';
import BackgroundMusicPlayer from '@/components/layout/background-music-player';
import SplashScreen from '@/components/layout/splash-screen';
import AnimatedCoin from '@/components/rewards/animated-coin';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
              <PageLayout>{children}</PageLayout>
              <BackgroundMusicPlayer />
            </AuthProvider>
            </ThemeProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
