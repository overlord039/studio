

"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import LoginSelectionScreen from '@/components/auth/login-selection-screen';
import { Loader2 } from 'lucide-react';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // Show the login selection screen on any page if the user is not logged in.
    if (!currentUser) {
        return <LoginSelectionScreen />;
    }

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
