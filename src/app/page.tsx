
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users,
  Speaker,
  Calculator,
  Bot,
  Globe
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { useSound } from '@/contexts/sound-context';
import FeedbackForm from '@/components/layout/feedback-form';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const { playSound } = useSound();

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

  return (
    <>
    <div className="flex-grow flex flex-col items-center space-y-2 p-2">
      {/* Hero Section */}
      <section className="flex justify-center items-center w-full gap-2">
         <Image 
            src="/applogo.png" 
            alt="HousieHub Logo" 
            width={250} 
            height={250} 
            className="h-auto w-[180px] md:w-[250px]"
            priority 
          />
      </section>

      {currentUser && !loading && (
        <div className="text-center my-2">
          <p className="text-xl font-semibold text-white">Welcome, {currentUser.displayName || 'Guest'}!</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
            <Card 
            className="flex-1 bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithAuth('/online')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/online') }}
            >
            <CardContent className="flex flex-row items-center justify-center p-4 gap-3 text-center">
                <Globe className="h-6 w-6" />
                <p className="text-lg font-bold">Online</p>
            </CardContent>
            </Card>

            <Card 
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithAuth('/play-with-computer')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/play-with-computer') }}
            >
            <CardContent className="flex flex-row items-center justify-center p-4 gap-3 text-center">
                <Bot className="h-6 w-6" />
                <p className="text-lg font-bold">Offline</p>
            </CardContent>
            </Card>

            <Card 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithAuth('/create-room')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/create-room') }}
            >
            <CardContent className="flex flex-row items-center justify-center p-4 gap-3 text-center">
                <Users className="h-6 w-6" />
                <p className="text-lg font-bold">Friends</p>
            </CardContent>
            </Card>
        </div>
        
      </div>
      {currentUser && !loading && currentUser.stats.coins === 0 && (
        <Card className="w-full max-w-md bg-accent/20 border-accent/50 p-4 my-2">
          <CardContent className="p-0 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-2">
                <Image src="/coin.png" alt="Coins" width={24} height={24} />
                <p className="font-bold text-lg">You have 0 coins!</p>
            </div>
            <p className="text-sm">Play offline games against bots to earn coins</p>
            <Button 
                onClick={() => handleNavigateWithAuth('/play-with-computer')}
                variant="secondary"
                size="sm"
            >
                Play Offline
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    {/* Bottom navigation for mobile, above footer */}
      <div className="mt-auto px-4 pb-4 flex justify-between items-center">
        <Card 
          className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer rounded-2xl shadow-lg w-32"
          onClick={() => handleFreeToolsNavigation('/number-caller')}
          role="button"
        >
          <CardContent className="flex flex-col items-center justify-center p-2 text-center">
            <Speaker className="h-6 w-6 mb-1" />
            <p className="text-xs font-bold">Number Caller</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-yellow-600 text-white hover:bg-yellow-700 transition-colors cursor-pointer rounded-2xl shadow-lg w-32"
          onClick={() => handleFreeToolsNavigation('/prize-calculator')}
          role="button"
        >
          <CardContent className="flex flex-col items-center justify-center p-2 text-center">
            <Calculator className="h-6 w-6 mb-1" />
            <p className="text-xs font-bold">Prize Calculator</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
