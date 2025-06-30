
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Settings, HelpCircle, X, Volume2, Music, Bell, Trash2, Users, Info, Facebook, Share2, Linkedin, Mail, Sun, Moon, Monitor } from 'lucide-react';
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

const SettingsModal = () => {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme } = useTheme();
  const { isSfxMuted, toggleSfxMute, isBgmEnabled, toggleBgm } = useSound();
  const { logout } = useAuth();
  const { toast } = useToast();

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
    <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        {/* Header Ribbon */}
        <header className="bg-primary text-primary-foreground text-center p-4 relative flex-shrink-0">
            <h2 className="text-2xl font-bold tracking-wider">SETTINGS</h2>
             <DialogClose className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </DialogClose>
        </header>

        <div className="flex flex-grow min-h-0">
            {/* Left Sidebar */}
            <aside className="w-1/4 bg-background p-4 border-r border-border/10">
                <nav className="flex flex-col gap-2">
                    <TabButton id="general" label="General" icon={Settings} />
                    <TabButton id="social" label="Social" icon={Users} />
                    <TabButton id="about" label="About" icon={Info} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="w-3/4 p-8 overflow-y-auto">
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                                <Label htmlFor="sfx-toggle" className="flex items-center gap-2 cursor-pointer"><Volume2/> Sound Effects</Label>
                                <Switch id="sfx-toggle" checked={!isSfxMuted} onCheckedChange={toggleSfxMute} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                                <Label htmlFor="bgm-toggle" className="flex items-center gap-2 cursor-pointer"><Music/> Background Music</Label>
                                <Switch id="bgm-toggle" checked={isBgmEnabled} onCheckedChange={toggleBgm} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                                <Label htmlFor="notifications-toggle" className="flex items-center gap-2 text-muted-foreground"><Bell/> Notifications</Label>
                                <Switch id="notifications-toggle" disabled />
                            </div>
                            <div className="p-3 rounded-lg bg-background space-y-2">
                                <Label>Theme</Label>
                                <ThemeToggle />
                            </div>
                        </div>
                        <div className="pt-8 border-t border-border/10">
                            <h3 className="text-xl font-semibold text-destructive mb-2">Danger Zone</h3>
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

                {activeTab === 'about' && (
                    <div className="flex flex-col items-center text-center space-y-6">
                        <Image src="/logonew.png" alt="HousieHub Logo" width={150} height={42} className="h-auto" />
                        <div className="space-y-2">
                            <p>Developed by: <span className="font-bold">Durga Sankar</span></p>
                            <div className="flex justify-center items-center space-x-4">
                                <a href="#" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Linkedin className="h-6 w-6" />
                                </a>
                                <a href="mailto:durgasankar.d@gmail.com" aria-label="Email" className="text-muted-foreground hover:text-primary transition-colors">
                                <Mail className="h-6 w-6" />
                                </a>
                            </div>
                        </div>
                        <Link href="/legal/privacy-policy" className="text-sm font-bold uppercase tracking-wider underline hover:text-primary">
                            Privacy Policy
                        </Link>
                        <p className="text-xs italic text-muted-foreground">Sound effects and music sourced from pixabay</p>
                        <p className="text-xs italic text-muted-foreground">Built with ❤️ using React, Node, and AI-assisted tools.</p>
                    </div>
                )}
            </main>
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
      return <div className="h-8 w-8 bg-primary/50 animate-pulse rounded-full border-2 border-primary"></div>;
    }

    if (currentUser) {
      return (
        <Link href="/profile" passHref>
          <Button variant="secondary" className="relative p-0 h-8 w-8 rounded-full border-2 border-primary">
            <Avatar className="h-8 w-8">
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
    }
    
    return <div className="h-8 w-8" />;
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
          <Link href="/how-to-play" passHref>
              <Button variant="secondary" className="px-2 md:px-3">
                  <HelpCircle className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">How to Play</span>
              </Button>
          </Link>
          
          <AuthContent />

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                <Settings className="h-[1.2rem] w-[1.2rem]" />
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
