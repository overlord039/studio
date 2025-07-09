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
import { playSound } from '@/lib/sounds';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();

  const handleNavigateWithAuth = (path: string) => {
    playSound('cards.mp3');
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to play with friends.",
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
    <div className="flex-grow flex flex-col items-center space-y-2 p-2">
      {/* Hero Section */}
      <section className="flex justify-center w-full">
         <Image 
            src="/applogo.png" 
            alt="HousieHub Logo" 
            width={300} 
            height={300} 
            className="h-auto w-[200px] md:w-[300px]"
            priority 
          />
      </section>

      {currentUser && !loading && (
        <div className="text-center my-2">
          <p className="text-xl font-semibold text-white">Welcome, {currentUser.displayName || 'Guest'}!</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-4">
        <Card 
          className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
          onClick={() => handleNavigateWithAuth('/create-room')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/create-room') }}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            <Users className="h-10 w-10 mb-2" />
            <p className="text-lg font-bold">Friends</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
          onClick={() => handleNavigateWithAuth('/play-with-computer')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/play-with-computer') }}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            <Bot className="h-10 w-10 mb-2" />
            <p className="text-lg font-bold">vs Computer</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gray-500 text-white rounded-2xl shadow-lg relative opacity-50 cursor-not-allowed"
          role="button"
          aria-disabled="true"
        >
          <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs font-bold uppercase px-2 py-1 rounded-full z-10">
              Coming Soon
          </div>
          <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            <Globe className="h-10 w-10 mb-2" />
            <p className="text-lg font-bold">Online</p>
          </CardContent>
        </Card>
        
        <section className="grid grid-cols-2 gap-4">
          <Card 
            className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleFreeToolsNavigation('/number-caller')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFreeToolsNavigation('/number-caller') }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Speaker className="h-10 w-10 mb-2" />
              <p className="text-lg font-bold">Number Caller</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleFreeToolsNavigation('/prize-calculator')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFreeToolsNavigation('/prize-calculator') }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Calculator className="h-10 w-10 mb-2" />
              <p className="text-lg font-bold">Prize Calculator</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
