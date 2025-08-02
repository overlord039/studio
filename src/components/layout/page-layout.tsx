

"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import FeedbackForm from './feedback-form';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const showHeaderAndFooter = pathname === '/' || pathname.startsWith('/online');
    const showActionIcons = showHeaderAndFooter;

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
                 {showActionIcons && (
                    <div className="fixed top-24 right-4 z-40 flex flex-col gap-2">
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
