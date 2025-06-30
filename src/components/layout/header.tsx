"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Settings, HelpCircle, X, Volume2, Music, Bell, Trash2, Users, Info, Facebook, Share2, Linkedin, Mail, Sun, Moon, Monitor, FileCode } from 'lucide-react';
import { useTheme } from "next-themes";
import { useAuth } from '@/contexts/auth-context';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSound } from '@/contexts/sound-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';


const SettingsModal = () => {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme } = useTheme();
  const { isSfxMuted, toggleSfxMute, isBgmEnabled, toggleBgm } = useSound();
  const { logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);


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
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
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
    <DialogContent className="w-full h-full max-h-full md:max-w-4xl md:h-[80vh] flex flex-col p-0 overflow-hidden md:rounded-lg">
        <header className="bg-primary text-primary-foreground text-center p-4 relative flex-shrink-0">
            <h2 className="text-2xl font-bold tracking-wider">SETTINGS</h2>
             <DialogClose className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-7 w-7" />
                <span className="sr-only">Close</span>
            </DialogClose>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-0">
            <aside className="hidden md:block w-1/4 bg-card p-4 border-r border-border">
                <nav className="flex flex-col gap-2">
                    <TabButton id="general" label="General" icon={Settings} />
                    <TabButton id="social" label="Social" icon={Users} />
                    <TabButton id="how-to-play" label="How to Play" icon={HelpCircle} />
                    <TabButton id="developer-note" label="Developer Note" icon={FileCode} />
                    <TabButton id="about" label="About" icon={Info} />
                </nav>
            </aside>
            
            <div className="flex-grow flex flex-col">
              <nav className="md:hidden flex-shrink-0 flex p-1 border-b justify-around bg-card">
                  <MobileTabButton id="general" label="General" icon={Settings} />
                  <MobileTabButton id="social" label="Social" icon={Users} />
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
                                      <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                      </AlertDialogDescription>
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

                  {activeTab === 'social' && (
                      <div className="space-y-6">
                          <h3 className="text-xl font-semibold">Social Accounts</h3>
                          <p className="text-muted-foreground">Connect your accounts for a seamless HousieHub experience with friends.</p>
                          <div className="space-y-3">
                          <Button className="w-full bg-white text-black hover:bg-gray-200 shadow-sm"><GoogleIcon className="mr-2 h-5 w-5 fill-current" /> Continue with Google</Button>
                          <Button className="w-full bg-[#1877F2] text-white hover:bg-[#166fe5] shadow-sm"><Facebook className="mr-2 h-5 w-5" /> Login with Facebook</Button>
                          <Button variant="secondary" className="w-full" onClick={handleShare}><Share2 className="mr-2 h-5 w-5" /> Share Website</Button>
                          </div>
                      </div>
                  )}

                  {activeTab === 'how-to-play' && (
                     <div className="space-y-4">
                        <h3 className="text-2xl font-bold flex items-center"><HelpCircle className="mr-2 h-7 w-7 text-primary" /> How to Play</h3>
                        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-lg">1. Get Started</AccordionTrigger>
                                <AccordionContent className="text-base">
                                Create an account and log in. You can then create a new game room to host, or join a friend's room using their unique Room ID.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger className="text-lg">2. The Game</AccordionTrigger>
                                <AccordionContent className="text-base">
                                Once in the game lobby, confirm how many tickets you want to play with. When the game starts, numbers from 1 to 90 are called out. Click the matching numbers on your tickets to mark them.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger className="text-lg">3. Win Prizes</AccordionTrigger>
                                <AccordionContent className="text-base">
                                When you complete a winning pattern (e.g., Jaldi 5, a full line, or a Full House), click the corresponding 'Claim' button. The system automatically validates your claim. The first valid claim wins the prize for that pattern!
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                  )}

                  {activeTab === 'developer-note' && (
                    <div className="text-center space-y-6 text-card-foreground/80">
                      <h3 className="text-2xl font-bold">🎉 Developer Note</h3>
                      <p>
                        Hi, I’m <span className="font-semibold text-primary">Durga Sankar</span>, the developer of this Housie platform.
                      </p>
                      <p>
                        This is my original idea, built using AI tools to streamline development. My goal was simple: to help families and friends play Housie easily, whether they are near or far.
                      </p>
                      <p>
                        I believe technology should bring people closer, and this is my small step toward that goal.
                      </p>
                      <p className="font-semibold text-xl pt-2">– Durga Sankar</p>
                      
                      <div className="border-t pt-6 space-y-2">
                        <p className="text-sm">
                          Feel free to reach out if you have ideas, suggestions, or wish to collaborate.
                        </p>
                        <div className="flex justify-center items-center space-x-6">
                          <a href="mailto:durgasankar.d@gmail.com" aria-label="Email" className="text-muted-foreground hover:text-primary transition-colors">
                            <Mail className="h-7 w-7" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'about' && (
                      <div className="flex flex-col items-center text-center space-y-6">
                           <div>
                              <p className="text-center">Developed by</p>
                           </div>
                          <Image src="/logonew.png" alt="HousieHub Logo" width={150} height={42} className="h-auto" />
                           <Link href="/legal/privacy-policy" onClick={() => { setIsSettingsOpen(false); router.push('/legal/privacy-policy'); }} className="text-sm font-bold uppercase tracking-wider underline hover:text-primary">
                              Privacy Policy
                          </Link>
                          <p className="text-xs italic text-muted-foreground">Sound effects and music sourced from pixabay</p>
                      </div>
                  )}
              </main>
            </div>
        </div>
    </DialogContent>
  );
};

export default function Header() {
  const { currentUser, loading } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      return <Skeleton className="h-10 w-24 rounded-md" />;
    }

    if (!currentUser) {
      return (
        <div className="flex items-center gap-2">
          <Link href="/auth/login" passHref>
            <Button variant="secondary">Login</Button>
          </Link>
          <Link href="/auth/register" passHref>
            <Button variant="ghost">Register</Button>
          </Link>
        </div>
      );
    }
    
    return (
        <Link href="/profile" passHref>
          <Button variant="secondary" className="relative p-0 h-10 w-10 rounded-full border-2 border-black">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={`https://placehold.co/32x32.png?text=${currentUser.username.substring(0, 2).toUpperCase()}`} 
                alt={currentUser.username} 
                data-ai-hint="profile avatar"
              />
              <AvatarFallback>{currentUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </Link>
    );
  };

  return (
    <header className={cn(
      "bg-primary text-primary-foreground shadow-md sticky top-0 z-50 transition-transform duration-300 ease-in-out",
      isHidden && "-translate-y-full"
    )}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          HousieHub
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-3">
          <AuthContent />

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-10 w-10">
                <Settings className="h-7 w-7" />
                <span className="sr-only">Settings</span>
              </Button>
            </DialogTrigger>
            <SettingsModal />
          </Dialog>
        </nav>
      </div>
    </header>
  );
}
    