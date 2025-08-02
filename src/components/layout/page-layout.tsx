

"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import FeedbackForm from './feedback-form';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const showHeaderAndFooter = pathname === '/' || pathname.startsWith('/online');
    const showFeedbackButton = showHeaderAndFooter;

    const isSpecialLayoutPage = 
      (pathname?.includes('/room/') && (pathname.endsWith('/play') || pathname.endsWith('/lobby'))) || 
      pathname === '/' ||
      pathname?.startsWith('/number-caller') ||
      pathname?.startsWith('/create-room') ||
      pathname?.startsWith('/play-with-computer') ||
      pathname?.startsWith('/prize-calculator') ||
      pathname?.startsWith('/profile') ||
      pathname?.startsWith('/online');

    const mainClassName = cn(
        "flex-grow flex flex-col relative",
        !isSpecialLayoutPage && "container mx-auto px-4 py-8 justify-center"
    );

    return (
        <>
            {showHeaderAndFooter && <Header />}
            <main className={mainClassName}>
                {showFeedbackButton && (
                    <div className="absolute top-2 right-2 z-10">
                        <FeedbackForm />
                    </div>
                )}
                {children}
            </main>
            <Toaster />
            {showHeaderAndFooter && <Footer />}
        </>
    );
}
