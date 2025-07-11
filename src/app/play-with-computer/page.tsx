
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, Skull, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function PlayWithComputerModesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleModeSelection = (path: string) => {
    playSound('cards.mp3');
    router.push(path);
  };

  if (!currentUser) {
    // This will be handled by the AuthProvider, but as a fallback:
    return <div className="text-center p-8">Please log in to play.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Play with Computer</h1>
        <p className="text-white/80 mt-2">Choose your difficulty.</p>
      </div>
      <div className="w-full max-w-md space-y-6">
        <Card
          onClick={() => handleModeSelection('/play-with-computer/easy')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 rounded-full bg-green-500/20">
              <Smile className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Easy Mode</CardTitle>
              <CardDescription>You choose your tickets. A relaxed game.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          onClick={() => handleModeSelection('/play-with-computer/hard')}
          className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 rounded-full bg-red-500/20">
              <Skull className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Hard Mode</CardTitle>
              <CardDescription>Ticket counts are random. A challenging game.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
       <div className="mt-8 w-full max-w-md">
        <Link href="/" passHref>
          <Button variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
