"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    // Check for pages that should have a custom layout (no header/footer).
    const isSpecialLayoutPage = 
      (pathname?.includes('/room/') && pathname.endsWith('/play')) || 
      pathname?.startsWith('/number-caller');

    const mainClassName = cn(
        "flex-grow",
        // For all pages except special layout pages, apply standard container padding.
        // The special pages will manage their own padding.
        !isSpecialLayoutPage && "container mx-auto px-4 py-8"
    );

    return (
        <>
            {!isSpecialLayoutPage && <Header />}
            <main className={mainClassName}>
                {children}
            </main>
            <Toaster />
            {!isSpecialLayoutPage && <Footer />}
        </>
    );
}
