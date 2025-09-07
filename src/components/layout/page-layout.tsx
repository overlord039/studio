

"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import React, from 'react';
import FeedbackForm from './feedback-form';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare, Calendar, Award, Shield, Badge as BadgeIcon, Medal, Trophy, Star, CheckCircle, X, Speaker, Calculator, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { SettingsModal } from './header';
import DailyRewardDialog from '../rewards/daily-reward-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import type { UserStats } from '@/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSound } from '@/contexts/sound-context';
import { useToast } from "@/hooks/use-toast";

const BadgeImageDialog = ({ src, alt }: { src: string, alt: string }) => (
    <DialogContent className="p-0 bg-transparent border-none shadow-none w-auto flex items-center justify-center">
      <DialogTitle className="sr-only">{alt}</DialogTitle>
      <Image src={src} alt={alt} width={256} height={256} className="rounded-lg" />
    </DialogContent>
);


const AchievementsDialog = ({ earnedBadges, stats }: { earnedBadges: Set<string>, stats: UserStats }) => (
    <DialogContent className="max-w-xl w-[95vw] md:w-full">
        <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold tracking-wider">Achievements</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogClose>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[80vh] md:max-h-[70vh] overflow-y-auto scrollbar-hide">
            {Object.values(BADGE_DEFINITIONS).map(badgeDef => {
                const hasBadge = earnedBadges.has(badgeDef.name);
                return (
                    <Card
                        key={badgeDef.name}
                        className={cn(
                            "transition-all",
                            hasBadge 
                                ? "bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/50"
                                : "bg-secondary/30"
                        )}
                    >
                        <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                           <div className="flex-shrink-0">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <button className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring rounded-full">
                                            <Image src={badgeDef.icon} alt={badgeDef.name} width={64} height={64} className="h-16 w-16" />
                                        </button>
                                    </DialogTrigger>
                                    <BadgeImageDialog src={badgeDef.icon} alt={badgeDef.name} />
                                </Dialog>
                           </div>
                           <div className="flex-grow space-y-1 w-full text-left">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                    <CardTitle className={cn(
                                        "text-lg font-bold",
                                        hasBadge ? 'text-green-800 dark:text-green-200' : 'text-foreground'
                                    )}>{badgeDef.name}</CardTitle>
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-400/20 px-2 py-1 rounded-full w-fit mt-1 sm:mt-0">
                                        <Image src="/coin.png" alt="Coin" width={16} height={16} />
                                        <span>Reward: {badgeDef.reward} Coins</span>
                                    </div>
                                </div>
                               <p className="text-sm text-muted-foreground pt-1">{badgeDef.description}</p>
                               {hasBadge && <CheckCircle className="h-6 w-6 text-green-500 mt-2" />}
                           </div>
                        </CardHeader>
                        {!hasBadge && (
                          <CardContent className="p-4 pt-0">
                            <div className="space-y-2">
                              {badgeDef.criteria.map((criterion, index) => {
                                const current = criterion.getCurrent(stats);
                                const target = criterion.target;
                                const progress = Math.min(100, (current / target) * 100);

                                return (
                                  <div key={index} className="text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-medium text-muted-foreground">{criterion.label}</span>
                                      <span className="font-semibold">{current} / {target}</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    </DialogContent>
);


export default function PageLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentUser, handleClaimReward, isRewardDialogOpen, setIsRewardDialogOpen, canClaimReward } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { playSound } = useSound();

    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('general');
    
    React.useEffect(() => {
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

    const handleNavigateWithAuth = (path: string) => {
        playSound('cards.mp3');
        if (!currentUser) {
        toast({
            title: "Login Required",
            description: "Please sign in to play.",
            variant: "destructive",
        });
        return;
        }
        router.push(path);
    };

    const handleFreeToolsNavigation = (path: string) => {
        playSound('cards.mp3');
        router.push(path);
    };


    const showHeader = pathname === '/' || 
                       pathname.startsWith('/online') || 
                       pathname.endsWith('/lobby') || 
                       pathname.startsWith('/create-room');

    const showFooter = pathname === '/';

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
            {showHeader && <Header />}
            <main className={mainClassName}>
                {children}
            </main>
            <Toaster />
            {showFooter && currentUser && (
                 <footer className="mt-auto px-2 pb-2 w-full max-w-lg mx-auto sticky bottom-2 z-10">
                    <Card className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-full shadow-lg">
                    <CardContent className="p-1 flex justify-around items-center">
                        <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="flex-col h-auto text-white rounded-full aspect-square">
                                            {canClaimReward && !isRewardDialogOpen && (
                                                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                </span>
                                            )}
                                            <Calendar className="h-5 w-5 mb-0.5" />
                                            <div className="text-[10px] leading-tight text-center">
                                                <span>Daily</span>
                                                <span>Bonus</span>
                                            </div>
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Daily Bonus</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DailyRewardDialog 
                                user={currentUser} 
                                onClaim={handleClaimAndClose}
                            />
                        </Dialog>
                        <Dialog>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="flex-col h-auto text-white rounded-full aspect-square">
                                            <Award className="h-5 w-5 mb-0.5" />
                                            <span className="text-[10px]">Achievements</span>
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Achievements</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <AchievementsDialog earnedBadges={new Set(currentUser.stats.badges || [])} stats={currentUser.stats} />
                        </Dialog>
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    className="flex-col h-auto text-white rounded-full aspect-square"
                                    onClick={() => handleNavigateWithAuth('/leaderboard')}
                                >
                                    <Trophy className="h-5 w-5 mb-0.5" />
                                    <span className="text-[10px]">Leaders</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Leaderboard</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    className="flex-col h-auto text-white rounded-full aspect-square"
                                    onClick={() => handleFreeToolsNavigation('/number-caller')}
                                >
                                    <Speaker className="h-5 w-5 mb-0.5" />
                                    <span className="text-[10px]">Caller</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Number Caller</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <FeedbackForm />
                    </CardContent>
                    </Card>
                </footer>
            )}
        </>
    );
}
