
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, Users, LogIn as LogInIcon, Info, UserPlus, HelpCircle, Dices } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleJoinRoom = () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to join a room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    const trimmedRoomId = joinRoomId.trim();
    if (trimmedRoomId) {
      router.push(`/room/${trimmedRoomId}/lobby`);
    } else {
      toast({
        title: "Room ID Required",
        description: "Please enter a Room ID to join.",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoom = () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to create a room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    router.push('/create-room');
  };

  return (
    <div className="py-8 space-y-12">
      <section className="text-center py-16 bg-gradient-to-br from-primary via-purple-500 to-accent rounded-xl shadow-2xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-primary-foreground mb-6 tracking-tight" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>
          Welcome to HousieHub!
        </h1>
        <p className="text-xl md:text-2xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
          The ultimate online destination to play the classic game of Housie (Tambola/Bingo) with friends and family.
        </p>
        {!loading && !currentUser && (
          <div className="space-x-4">
            <Link href="/auth/login" passHref>
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3 hover:bg-secondary/90 transition-transform hover:scale-105">
                <LogInIcon className="mr-2 h-5 w-5" /> Login
              </Button>
            </Link>
            <Link href="/auth/register" passHref>
              <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-transform hover:scale-105">
                <UserPlus className="mr-2 h-5 w-5" /> Register
              </Button>
            </Link>
          </div>
        )}
         {currentUser && (
          <p className="text-lg text-primary-foreground/90">Logged in as: <span className="font-semibold">{currentUser.username}</span></p>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Dices className="h-16 w-16 text-accent" />
            </div>
            <CardTitle className="flex items-center justify-center text-3xl font-bold">
              Start a Game
            </CardTitle>
            <CardDescription className="text-md">Choose how you want to play.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-md py-3" size="lg" disabled>
              Start Practice Game (Soon!)
            </Button>
            
            <Button className="w-full text-md py-3" size="lg" onClick={handleCreateRoom} disabled={loading}>
              Create Multiplayer Room
            </Button>
            
            <div className="space-y-3 pt-2">
              <Input 
                type="text" 
                placeholder="Enter Room ID to Join" 
                className="text-md py-3 h-12"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                disabled={loading}
              />
              <Button variant="outline" className="w-full text-md py-3" size="lg" onClick={handleJoinRoom} disabled={loading}>
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="text-center">
             <div className="flex justify-center mb-4">
              <HelpCircle className="h-16 w-16 text-accent" />
            </div>
            <CardTitle className="flex items-center justify-center text-3xl font-bold">
              How to Play Housie
            </CardTitle>
            <CardDescription className="text-md">A quick guide to get you started.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">What is Housie?</AccordionTrigger>
                <AccordionContent className="text-base pl-2 border-l-2 border-accent/50 ml-2">
                  Housie, also known as Tambola or Bingo, is a game of chance. The caller announces numbers one by one, and players mark these on their tickets if present.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Game Objective</AccordionTrigger>
                <AccordionContent className="text-base pl-2 border-l-2 border-accent/50 ml-2">
                  The objective is to be the first to mark off numbers for a specific winning pattern (e.g., Jaldi 5, Lines, Full House) and claim the prize.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Winning Patterns</AccordionTrigger>
                <AccordionContent className="text-base pl-2 border-l-2 border-accent/50 ml-2">
                  Common patterns include:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Jaldi 5:</strong> First 5 numbers marked anywhere on any of your tickets.</li>
                    <li><strong>Top Line:</strong> All numbers in the top row of a single ticket.</li>
                    <li><strong>Middle Line:</strong> All numbers in the middle row of a single ticket.</li>
                    <li><strong>Bottom Line:</strong> All numbers in the bottom row of a single ticket.</li>
                    <li><strong>Full House:</strong> All 15 numbers on a single ticket.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Playing on HousieHub</AccordionTrigger>
                <AccordionContent className="text-base pl-2 border-l-2 border-accent/50 ml-2">
                  Log in or register, then create or join a room. Once in the lobby, confirm your tickets. When the game starts, mark numbers as they're called and use the "Claim" buttons when you achieve a winning pattern!
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
