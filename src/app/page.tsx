
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
import FeedbackForm from '@/components/layout/feedback-form';

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
        <div className="grid grid-cols-3 gap-4">
            <Card 
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithAuth('/create-room')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/create-room') }}
            >
            <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                <Users className="h-8 w-8 mb-1" />
                <p className="text-sm font-bold">Friends</p>
            </CardContent>
            </Card>

            <Card 
            className="bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
            onClick={() => handleNavigateWithAuth('/play-with-computer')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateWithAuth('/play-with-computer') }}
            >
            <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                <Bot className="h-8 w-8 mb-1" />
                <p className="text-sm font-bold">vs Computer</p>
            </CardContent>
            </Card>

            <Card 
            className="bg-gray-500 text-white rounded-2xl shadow-lg relative opacity-50 cursor-not-allowed"
            role="button"
            aria-disabled="true"
            >
            <div className="absolute top-1 right-1 bg-muted text-muted-foreground text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded-full z-10">
                Coming Soon
            </div>
            <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                <Globe className="h-8 w-8 mb-1" />
                <p className="text-sm font-bold">Online</p>
            </CardContent>
            </Card>
        </div>
        
        <div className="flex justify-center">
          <section className="grid grid-cols-2 gap-4 w-2/3">
            <Card 
              className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
              onClick={() => handleFreeToolsNavigation('/number-caller')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFreeToolsNavigation('/number-caller') }}
            >
              <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                <Speaker className="h-8 w-8 mb-1" />
                <p className="text-sm font-bold">Number Caller</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer rounded-2xl shadow-lg transform hover:-translate-y-1"
              onClick={() => handleFreeToolsNavigation('/prize-calculator')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFreeToolsNavigation('/prize-calculator') }}
            >
              <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                <Calculator className="h-8 w-8 mb-1" />
                <p className="text-sm font-bold">Prize Calculator</p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      <div className="pt-4 z-50">
        <FeedbackForm />
      </div>
    </div>
  );
}
