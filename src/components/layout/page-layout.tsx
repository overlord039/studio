

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
    const { currentUser, handleClaimReward } = useAuth();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);

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
        setIsRewardDialogOpen(false);
    }


    const showHeaderAndFooter = pathname === '/' || pathname.startsWith('/online');
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
                       <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                           <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
                        </Dialog>
                        <FeedbackForm />
                         {currentUser && (
                             <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-12 w-12">
                                                    <Calendar className="h-6 w-6" />
                                                    <span className="sr-only">Daily Rewards</span>
                                                </Button>
                                            </DialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Daily Rewards</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {isRewardDialogOpen && (
                                    <DailyRewardDialog 
                                        user={currentUser} 
                                        onClaim={handleClaimAndClose}
                                        onClose={() => setIsRewardDialogOpen(false)}
                                        open={isRewardDialogOpen}
                                        onOpenChange={setIsRewardDialogOpen}
                                    />
                                )}
                            </Dialog>
                        )}
                    </div>
                )}
                {children}
            </main>
            <Toaster />
            {showHeaderAndFooter && <Footer />}
        </>
    );
}
