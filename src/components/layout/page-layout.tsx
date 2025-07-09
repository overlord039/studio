

"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const showHeaderAndFooter = pathname === '/';

    const isSpecialLayoutPage = 
      (pathname?.includes('/room/') && (pathname.endsWith('/play') || pathname.endsWith('/lobby'))) || 
      pathname === '/' ||
      pathname?.startsWith('/number-caller') ||
      pathname?.startsWith('/create-room') ||
      pathname?.startsWith('/play-with-computer') ||
      pathname?.startsWith('/prize-calculator') ||
      pathname?.startsWith('/profile');

    const mainClassName = cn(
        "flex-grow flex flex-col",
        !isSpecialLayoutPage && "container mx-auto px-4 py-8 justify-center"
    );

    return (
        <>
            {showHeaderAndFooter && <Header />}
            <main className={mainClassName}>
                {children}
            </main>
            <Toaster />
            {showHeaderAndFooter && <Footer />}
        </>
    );
}
