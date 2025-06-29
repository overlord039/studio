
"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    // A simple check to see if we are on the play page.
    const isGamePage = pathname?.includes('/room/') && pathname.endsWith('/play');

    const mainClassName = cn(
        "flex-grow",
        // For all pages except the game page, apply standard container padding.
        // The game page will manage its own padding.
        !isGamePage && "container mx-auto px-4 py-8"
    );

    return (
        <>
            {!isGamePage && <Header />}
            <main className={mainClassName}>
                {children}
            </main>
            <Toaster />
            {!isGamePage && <Footer />}
        </>
    );
}
