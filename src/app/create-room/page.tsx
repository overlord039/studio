"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, House, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { playSound } from '@/lib/sounds';

type Mode = 'public' | 'private';

interface GameOption {
  mode: Mode;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  disabled: boolean;
  href: string;
  iconBgColor: string;
  iconTextColor: string;
}

export default function CreateRoomSelectionPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const options: GameOption[] = [
    {
      mode: 'public' as Mode,
      title: "Public Multiplayer",
      subtitle: "Play globally with auto-called numbers",
      icon: Globe,
      description: "Numbers are called automatically at a fixed speed. No host controls for manual calling.",
      disabled: false,
      href: "/create-room/public",
      iconBgColor: "bg-accent/20",
      iconTextColor: "text-accent",
    },
    {
      mode: 'private' as Mode,
      title: "Private Multiplayer",
      subtitle: "Play with friends and family",
      icon: House,
      description: "Host can choose between automatic system calls or manual calls, and can pause/resume the game.",
      disabled: false,
      href: "/create-room/private",
      iconBgColor: "bg-primary/20",
      iconTextColor: "text-primary",
    }
  ];
  
  const handleCardClick = (option: GameOption) => {
    playSound('button2.mp3');
    if (option.disabled) {
      toast({
        title: "Coming Soon!",
        description: "This feature is not yet available.",
      });
      return;
    }

    if (!currentUser) {
       toast({
        title: "Login Required",
        description: "Please log in to create a room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    
    router.push(option.href);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Choose Your Game Mode</h1>
        <p className="text-white/80 mt-2 text-base">Select how you want to play Housie.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl">
        {options.map((option) => (
           <Card
            key={option.mode}
            onClick={() => handleCardClick(option)}
            className={cn(
              "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer relative overflow-hidden border-2 border-transparent flex flex-col",
              option.disabled ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''
            )}
          >
             {option.disabled && (
                <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs font-bold uppercase px-2 py-1 rounded-full">
                    Coming Soon
                </div>
            )}
            <CardHeader className="items-center text-center p-6">
              <div className={cn("p-3 rounded-full mb-3 inline-block", option.iconBgColor)}>
                <option.icon className={cn("h-8 w-8", option.iconTextColor)} />
              </div>
              <CardTitle className="text-lg font-bold">{option.title}</CardTitle>
              <CardDescription className="text-sm">{option.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="text-center p-6 pt-0 flex-grow">
              <p className="text-muted-foreground text-sm">{option.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 w-full max-w-xl">
        <Link href="/" passHref>
          <Button variant="destructive">
            <LogOut className="mr-2 h-4 w-4 rotate-180" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
