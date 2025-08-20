
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Settings, HelpCircle, X, Volume2, Music, Bell, Trash2, Info, Sun, Moon, Monitor, FileCode, MessageSquare, Gamepad2, UserPlus, LogIn, Ticket, CheckSquare, Trophy, Mail, Star } from 'lucide-react';
import { useTheme } from "next-themes";
import { useAuth } from '@/contexts/auth-context';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSound } from '@/contexts/sound-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getXpForNextLevel } from '@/lib/constants';

export const SettingsModal = ({ open, onOpenChange, activeTab, setActiveTab }: { open: boolean, onOpenChange: (open: boolean) => void, activeTab: string; setActiveTab: (tab: string) => void; }) => {
  const { theme, setTheme } = useTheme();
  const { isSfxMuted, toggleSfxMute, isBgmEnabled, toggleBgm } = useSound();
  const { logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();


  const handleShare = async () => {
    const shareData = {
      title: 'HousieHub',
      text: 'Come play Housie with me on HousieHub!',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied!",
          description: "The website link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Error",
        description: "Could not share the link.",
        variant: "destructive",
      });
    }
  };

  const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
  );

  const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ElementType }) => (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-base py-6 rounded-xl",
        activeTab === id ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-primary/10'
      )}
      onClick={() => setActiveTab(id)}
    >
      <Icon className="mr-3 h-5 w-5" /> {label}
    </Button>
  );
  
  const MobileTabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ElementType }) => (
    <Button
      variant="ghost"
      className={cn(
        "flex-col h-auto p-2 rounded-lg text-xs w-1/4",
        activeTab === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
      )}
      onClick={() => setActiveTab(id)}
    >
      <Icon className="h-5 w-5 mb-1" />
      {label}
    </Button>
  );

  const ThemeToggle = () => (
    <div className="p-1 bg-secondary rounded-lg flex items-center justify-around">
      {(['light', 'dark', 'system'] as const).map(t => (
        <Button
          key={t}
          variant="ghost"
          size="sm"
          onClick={() => setTheme(t)}
          className={cn(
            "capitalize w-full",
            theme === t && 'bg-background shadow-sm text-foreground'
          )}
        >
          <span className="mr-2">
            {t === 'light' && <Sun className="h-4 w-4" />}
            {t === 'dark' && <Moon className="h-4 w-4" />}
            {t === 'system' && <Monitor className="h-4 w-4" />}
          </span>
          {t}
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] w-[90vw] md:max-w-4xl md:h-[80vh] flex flex-col p-0 overflow-hidden rounded-lg">
        <DialogHeader className="bg-primary text-primary-foreground text-center p-4 relative flex-shrink-0">
            <DialogTitle className="text-2xl font-bold tracking-wider">SETTINGS</DialogTitle>
             <DialogClose className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-7 w-7" />
                <span className="sr-only">Close</span>
            </DialogClose>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-grow min-h-0">
            <aside className="hidden md:block w-1/4 bg-card p-4 border-r border-border">
                <nav className="flex flex-col gap-2">
                    <TabButton id="general" label="General" icon={Settings} />
                    <TabButton id="how-to-play" label="How to Play" icon={HelpCircle} />
                    <TabButton id="developer-note" label="Developer Note" icon={FileCode} />
                    <TabButton id="about" label="About" icon={Info} />
                </nav>
            </aside>
            
            <div className="flex-grow flex flex-col min-h-0">
              <nav className="md:hidden flex-shrink-0 flex p-1 border-b justify-around bg-card">
                  <MobileTabButton id="general" label="General" icon={Settings} />
                  <MobileTabButton id="how-to-play" label="How to Play" icon={HelpCircle} />
                  <MobileTabButton id="developer-note" label="Developer" icon={FileCode} />
                  <MobileTabButton id="about" label="About" icon={Info} />
              </nav>

              <main className="flex-grow p-6 md:p-8 overflow-y-auto bg-background">
                  {activeTab === 'general' && (
                      <div className="space-y-8">
                          <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                  <Label htmlFor="sfx-toggle" className="flex items-center gap-2 cursor-pointer"><Volume2/> Sound Effects</Label>
                                  <Switch id="sfx-toggle" checked={!isSfxMuted} onCheckedChange={toggleSfxMute} />
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                  <Label htmlFor="bgm-toggle" className="flex items-center gap-2 cursor-pointer"><Music/> Background Music</Label>
                                  <Switch id="bgm-toggle" checked={isBgmEnabled} onCheckedChange={toggleBgm} />
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                  <Label htmlFor="notifications-toggle" className="flex items-center gap-2 text-muted-foreground"><Bell/> Notifications</Label>
                                  <Switch id="notifications-toggle" disabled />
                              </div>
                              <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
                                  <Label>Theme</Label>
                                  <ThemeToggle />
                              </div>
                          </div>
                          <div className="pt-8 border-t border-border/10">
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                  <Button variant="destructive" className="w-full"><Trash2 className="mr-2"/> Delete Account</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDesc>
                                      This action cannot be undone. This will permanently delete your account and remove your data from our servers. This is not implemented in this mock application.
                                      </AlertDialogDesc>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={logout} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </div>
                  )}

                  {activeTab === 'how-to-play' && (
                     <div className="space-y-4">
                        <p className="text-muted-foreground">A quick guide to get you started.</p>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger><UserPlus className="mr-2 h-5 w-5 text-accent"/>1. Create an Account</AccordionTrigger>
                                <AccordionContent className="text-base pl-8">
                                Sign up with Google or Email to save your game stats and play across devices. You can also play as a Guest, but your data won't be saved if you clear your browser cache.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-2">
                                <AccordionTrigger><Gamepad2 className="mr-2 h-5 w-5 text-accent"/>2. Choose a Game Mode</AccordionTrigger>
                                <AccordionContent className="text-base pl-8 space-y-2">
                                    <p><strong>Play with Friends:</strong> Create a private room and share the Room ID with your friends to play together.</p>
                                    <p><strong>Play vs Computer:</strong> Practice your skills against bot players in Easy or Hard mode.</p>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger><LogIn className="mr-2 h-5 w-5 text-accent"/>3. Join the Lobby</AccordionTrigger>
                                <AccordionContent className="text-base pl-8">
                                Once in the lobby, select how many tickets you want to play with for the upcoming game. You'll see other players join in real-time. The host starts the game when ready.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-4">
                                <AccordionTrigger><CheckSquare className="mr-2 h-5 w-5 text-accent"/>4. Mark Your Numbers</AccordionTrigger>
                                <AccordionContent className="text-base pl-8">
                                As numbers are called, they will appear at the top. If a called number is on any of your tickets, click on it to mark it. Marked numbers will turn green.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger><Trophy className="mr-2 h-5 w-5 text-accent"/>5. Claim Prizes</AccordionTrigger>
                                <AccordionContent className="text-base pl-8">
                                When you complete a winning pattern (e.g., Early 5, a full line, or a Full House), the corresponding claim button will become active. Click it to claim your prize. The system automatically validates your claim. The first valid claim wins!
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                  )}

                  {activeTab === 'developer-note' && (
                    <div className="text-center space-y-4 text-card-foreground/80">
                      <h3 className="text-xl font-bold">🎉 Developer Note</h3>
                      <p className="text-sm">
                        Hi, I’m <span className="font-semibold text-primary">Durga Sankar</span>, the developer of this Housie platform.
                      </p>
                      <p className="text-sm">
                        This is my original idea, built using AI tools to streamline development. My goal was simple: to help families and friends play Housie easily, whether they are near or far.
                      </p>
                      <p className="text-sm">
                        I believe technology should bring people closer, and this is my small step toward that goal.
                      </p>
                      <p className="font-semibold text-lg pt-2">– Durga Sankar</p>
                      
                      <div className="border-t pt-4 space-y-2">
                        <p className="text-xs">
                          Feel free to reach out if you have ideas, suggestions, or wish to collaborate.
                        </p>
                        <div className="flex justify-center items-center space-x-6">
                          <a href="mailto:durgasankar.d@gmail.com" aria-label="Email" className="text-muted-foreground hover:text-primary transition-colors">
                            <Mail className="h-6 w-6" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'about' && (
                      <div className="flex flex-col items-center text-center space-y-8">
                           <div className="text-center">
                              <p>Developed by</p>
                           </div>
                          <Image src="/logonew.png" alt="HousieHub Logo" width={150} height={42} className="h-auto" />
                          
                           <div className="w-full pt-6 border-t">
                              <h4 className="text-lg font-semibold mb-4">Legal & Information</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-center">
                                  {[
                                      { name: 'Support', href: '/legal/support' },
                                      { name: 'User Agreement', href: '/legal/user-agreement' },
                                      { name: 'Terms of Service', href: '/legal/user-agreement' },
                                      { name: 'Compliance', href: '/legal/compliance' },
                                      { name: 'Fair Play', href: '/legal/fair-play' },
                                      { name: 'Privacy Policy', href: '/legal/privacy-policy' },
                                      { name: 'Privacy Settings', href: '/legal/privacy-settings' },
                                  ].map(link => (
                                      <DialogClose asChild key={link.name}>
                                          <Link
                                              href={link.href}
                                              className="text-sm font-medium underline hover:text-primary"
                                          >
                                              {link.name}
                                          </Link>
                                      </DialogClose>
                                  ))}
                              </div>
                          </div>

                          <p className="text-xs italic text-muted-foreground pt-4">Sound effects and music sourced from pixabay</p>
                      </div>
                  )}
              </main>
            </div>
        </div>
    </DialogContent>
    </Dialog>
  );
};

export default function Header() {
  const { currentUser, loading } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const searchParams = useSearchParams();

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

  const controlNavbar = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY && window.scrollY > 50) { // if scroll down and past 50px
        setIsHidden(true);
      } else { // if scroll up
        setIsHidden(false);
      }
      setLastScrollY(window.scrollY); 
    }
  }, [lastScrollY]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [controlNavbar]);

  const AuthContent = () => {
    if (loading) {
      return <Skeleton className="h-12 w-40 rounded-full" />;
    }

    if (!currentUser) {
      return null;
    }
    
    const displayName = currentUser.displayName || 'G';
    const avatarFallback = currentUser.isGuest ? 'G' : displayName.substring(0, 2).toUpperCase();
    const level = currentUser.stats.level || 1;
    const currentXp = currentUser.stats.xp || 0;
    const xpForNext = getXpForNextLevel(level);
    const xpProgress = Math.min(100, (currentXp / xpForNext) * 100);

    const circumference = 2 * Math.PI * 18; // 2 * pi * radius
    const strokeDashoffset = circumference - (xpProgress / 100) * circumference;
    
    return (
      <div className="flex items-center gap-2">
        <Link href="/profile" passHref>
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/20 hover:bg-black/50 transition-colors cursor-pointer">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  className="stroke-primary/20"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
              </svg>
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage 
                    src={currentUser.photoURL || `https://placehold.co/48x48.png?text=${avatarFallback}`} 
                    alt={displayName} 
                    data-ai-hint="profile avatar"
                />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-fit">
                  <div className="flex items-center gap-0.5 bg-background text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-border">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-500"/>
                      <span>{level}</span>
                  </div>
              </div>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1 sm:gap-1.5 text-white bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/20">
          <Image src="/coin.png" alt="Coins" width={24} height={24} className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="font-bold text-base sm:text-lg pr-2">{currentUser.stats.coins ?? 0}</span>
        </div>
      </div>
    );
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 transition-transform duration-300 ease-in-out",
      isHidden && "-translate-y-full"
    )}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <AuthContent />
        <div className="flex items-center gap-2">
             <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12">
                        <Settings className="h-7 w-7 text-white" />
                    </Button>
                </DialogTrigger>
                <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
            </Dialog>
        </div>
      </div>
    </header>
  );
}

    