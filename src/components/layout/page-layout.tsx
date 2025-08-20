

"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import FeedbackForm from './feedback-form';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare, Calendar } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { SettingsModal } from './header';
import DailyRewardDialog from '../rewards/daily-reward-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentUser, handleClaimReward, isRewardDialogOpen, setIsRewardDialogOpen, canClaimReward } = useAuth();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    
    useEffect(() => {
        const settingsParam = searchParams.get('settings');
        const tabParam = searchParams.get('tab');

        if (settingsParam === 'open') {
        setIsSettingsOpen(true);
        if (tabParam) {
            setActiveTab(tabParam);
        }
        } else {
        setIsSettingsOpen(false);
        }
    }, [searchParams]);

    const handleClaimAndClose = async (day: number) => {
        await handleClaimReward(day);
    }


    const showHeaderAndFooter = pathname === '/' || pathname.startsWith('/online') || pathname.endsWith('/lobby') || pathname.startsWith('/create-room');
    const showActionIcons = pathname === '/';

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
                    <div className="fixed top-18 right-4 z-40 flex flex-col items-center gap-2">
                        <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-12 w-12 relative">
                                             {currentUser && canClaimReward && !isRewardDialogOpen && (
                                                <span className="absolute top-2 right-2 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                </span>
                                            )}
                                            <Calendar className="h-7 w-7 text-white" />
                                            <span className="sr-only">Daily Rewards</span>
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Daily Rewards</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {currentUser && (
                                <DailyRewardDialog 
                                    user={currentUser} 
                                    onClaim={handleClaimAndClose}
                                />
                            )}
                        </Dialog>
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
