

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
import { Settings, MessageSquare, Calendar, Award, Shield, Badge as BadgeIcon, Medal, Trophy, Star, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { SettingsModal } from './header';
import DailyRewardDialog from '../rewards/daily-reward-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import type { UserStats } from '@/types';
import Image from 'next/image';

const BadgeIconComponent = ({ iconName, badgeName, hasBadge, ...props }: { iconName: string, badgeName: string, hasBadge: boolean } & Omit<React.ComponentProps<typeof Shield>, 'color' | 'fill'>) => {
    const badgeColors: Record<string, string> = {
        "Bronze Competitor": "text-yellow-600 dark:text-yellow-500 fill-yellow-600/30 dark:fill-yellow-500/30",
        "Silver Veteran": "text-slate-500 dark:text-slate-400 fill-slate-500/30 dark:fill-slate-400/30",
        "Gold Master": "text-amber-500 dark:text-amber-400 fill-amber-500/30 dark:fill-amber-400/30",
        "Platinum Player": "text-blue-500 dark:text-blue-400 fill-blue-500/30 dark:fill-blue-400/30",
    };

    const unlockedColorClass = hasBadge
        ? badgeColors[badgeName] || "text-green-500 fill-green-500/20"
        : "text-muted-foreground";

    const finalClassName = cn(props.className, unlockedColorClass);

    const renderIcon = () => {
        const iconProps = { ...props, className: finalClassName };
        switch (iconName) {
            case 'Shield': return <Shield {...iconProps} />;
            case 'Award': return <Award {...iconProps} />;
            case 'Badge': return <BadgeIcon {...iconProps} />;
            case 'Medal': return <Medal {...iconProps} />;
            case 'Trophy': return <Trophy {...iconProps} />;
            default: return <Star {...iconProps} />;
        }
    };
    return renderIcon();
};

const AchievementsDialog = ({ earnedBadges, stats }: { earnedBadges: Set<string>, stats: UserStats }) => (
    <DialogContent className="max-w-xl w-[95vw] md:w-full">
        <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold tracking-wider">Achievements</DialogTitle>
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
                        <CardHeader className="p-4 flex flex-col md:flex-row items-center gap-4 space-y-0">
                           <div className="flex-shrink-0">
                                <BadgeIconComponent 
                                    iconName={badgeDef.icon}
                                    badgeName={badgeDef.name}
                                    hasBadge={hasBadge} 
                                    className="h-10 w-10"
                                />
                           </div>
                           <div className="flex-grow space-y-1 w-full text-center md:text-left">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className={cn(
                                            "text-md font-bold",
                                            hasBadge ? 'text-green-800 dark:text-green-200' : 'text-foreground'
                                        )}>{badgeDef.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground">{badgeDef.description}</p>
                                    </div>
                                    {hasBadge && <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />}
                                </div>
                               
                               <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 pt-1 bg-amber-400/20 px-2 py-1 rounded-full w-fit mx-auto md:mx-0">
                                   <Image src="/coin.png" alt="Coin" width={16} height={16} />
                                   <span>Reward: {badgeDef.reward} Coins</span>
                               </div>
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


    const showHeader = pathname === '/' || 
                       pathname.startsWith('/online') || 
                       pathname.endsWith('/lobby') || 
                       pathname.startsWith('/create-room');

    const showFooter = pathname === '/' || 
                       pathname.startsWith('/online') || 
                       pathname.endsWith('/lobby') || 
                       pathname.startsWith('/create-room');

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
                 {showActionIcons && currentUser && (
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
                        <Dialog>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-12 w-12">
                                            <Award className="h-7 w-7 text-white" />
                                            <span className="sr-only">Achievements</span>
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Achievements</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <AchievementsDialog earnedBadges={new Set(currentUser.stats.badges || [])} stats={currentUser.stats} />
                        </Dialog>

                        <FeedbackForm />
                    </div>
                )}
                {children}
            </main>
            <Toaster />
            {showFooter && <Footer />}
        </>
    );
}
