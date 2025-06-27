"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, House, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

type Mode = 'public' | 'private';

export default function CreateRoomSelectionPage() {
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleSelectMode = (mode: Mode) => {
    setSelectedMode(mode);
  };
  
  const handleContinue = () => {
    if (!currentUser) {
       toast({
        title: "Login Required",
        description: "Please log in to create a room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    
    if (selectedMode === 'private') {
      router.push('/create-room/private');
    } else if (selectedMode === 'public') {
      // Logic for public room creation, for now disabled.
       toast({
        title: "Coming Soon!",
        description: "Public multiplayer rooms are not yet available.",
      });
    }
  };

  const options = [
    {
      mode: 'public' as Mode,
      title: "Public Multiplayer",
      subtitle: "Play globally with auto-called numbers",
      icon: Globe,
      description: "Numbers are called automatically at a fixed speed. No host controls for manual calling.",
      disabled: true,
      href: "#"
    },
    {
      mode: 'private' as Mode,
      title: "Private Multiplayer",
      subtitle: "Play with friends and family",
      icon: House,
      description: "Host can choose between automatic system calls or manual calls, and can pause/resume the game.",
      disabled: false,
      href: "/create-room/private"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">Choose Your Game Mode</h1>
        <p className="text-muted-foreground mt-2 text-lg">Select how you want to play Housie.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {options.map((option) => (
           <Card
            key={option.mode}
            onClick={() => !option.disabled && handleSelectMode(option.mode)}
            className={cn(
              "shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer relative overflow-hidden border-2",
              selectedMode === option.mode ? 'border-primary shadow-primary/20' : 'border-transparent',
              option.disabled ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''
            )}
          >
             {selectedMode === option.mode && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
             {option.disabled && (
                <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs font-bold uppercase px-2 py-1 rounded-full">
                    Coming Soon
                </div>
            )}
            <CardHeader className="items-center text-center">
              <div className="p-4 bg-primary/20 rounded-full mb-4 inline-block">
                <option.icon className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">{option.title}</CardTitle>
              <CardDescription>{option.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground min-h-[4rem]">{option.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
       <div className="mt-12 w-full max-w-sm">
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedMode}
            onClick={handleContinue}
          >
           Continue
          </Button>
      </div>
    </div>
  );
}
