
"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { currentUser, loading } = useAuth();

    // Determine if the login selection should be shown.
    // It should only show on the root path if the user is not logged in.
    const showLoginSelection = !currentUser && !loading && pathname === '/';

    if (showLoginSelection) {
        return <LoginSelectionScreen />;
    }

    // Existing layout logic
    const showHeaderAndFooter = pathname === '/';

    const isSpecialLayoutPage = 
      (pathname?.includes('/room/') && (pathname.endsWith('/play') || pathname.endsWith('/lobby'))) || 
      pathname === '/' ||
      pathname?.startsWith('/number-caller') ||
      pathname?.startsWith('/create-room');

    const mainClassName = cn(
        "flex-grow flex flex-col",
        !isSpecialLayoutPage && "container mx-auto px-4 py-8"
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
