
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  LogIn as LogInIcon, 
  UserPlus, 
  Gamepad2, 
  UsersRound, 
  KeyRound, 
  Ticket,
  List, // Changed from ListNumbers
  CheckSquare,
  Award,
  Users,
  Zap,
  Shuffle,
  ShieldCheck,
  Smartphone,
  Laptop,
  SunMoon,
  GraduationCap,
  ChevronRight
} from 'lucide-react';
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

  const howToPlaySteps = [
    { icon: Ticket, title: "Get Your Tickets", description: "Players receive virtual tickets with a unique set of random numbers." },
    { icon: List, title: "Numbers Called", description: "Listen up! Numbers are called out one-by-one in real-time." }, // Changed from ListNumbers
    { icon: CheckSquare, title: "Mark Your Numbers", description: "If a called number matches one on your ticket, mark it off." },
    { icon: Award, title: "Claim Prizes", description: "Be the first to complete patterns like Jaldi 5, Lines, or a Full House to win!" },
    { icon: Users, title: "Play With Friends", description: "Create private rooms to play with friends or join public games for more fun." },
  ];

  const whyPlayWithUsFeatures = [
    { icon: Zap, title: "Real-time Multiplayer", description: "Experience seamless gameplay with friends, powered by fast technology." },
    { icon: Shuffle, title: "Fair Ticket Generation", description: "Our advanced algorithm ensures unique and fair Housie tickets every time." },
    { icon: ShieldCheck, title: "Secure & Private", description: "Play with peace of mind. Your game, your rules. No account sharing needed." },
    { icon: Smartphone, title: "Play Anywhere", description: "Enjoy HousieHub on your desktop, tablet, or mobile phone." },
    { icon: SunMoon, title: "Light & Dark Mode", description: "Choose a theme that suits your eyes for comfortable long play sessions." },
    { icon: GraduationCap, title: "Practice Mode", description: "New to Housie? Sharpen your skills in our stress-free practice mode." },
  ];

  return (
    <div className="py-8 md:py-12 space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-br from-primary via-purple-600 to-accent rounded-xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary-foreground mb-6 tracking-tight animate-fade-in-down" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>
            Welcome to the Ultimate Multiplayer Tambola Experience!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-3xl mx-auto animate-fade-in-up">
            Gather your friends and family for an exciting game of Housie (Tambola/Bingo). Create rooms, join games, and win big!
          </p>
          {!loading && !currentUser && (
            <div className="space-x-4 animate-fade-in">
              <Link href="/auth/login" passHref>
                <Button size="lg" variant="secondary" className="text-lg px-8 py-3 transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <LogInIcon className="mr-2 h-5 w-5" /> Login
                </Button>
              </Link>
              <Link href="/auth/register" passHref>
                <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary transform transition-all hover:scale-105 shadow-md hover:shadow-lg">
                  <UserPlus className="mr-2 h-5 w-5" /> Register
                </Button>
              </Link>
            </div>
          )}
          {currentUser && (
            <p className="text-lg text-primary-foreground/90 animate-fade-in">Logged in as: <span className="font-semibold">{currentUser.username}</span></p>
          )}
        </div>
      </section>

      {/* Main Options */}
      <section className="grid md:grid-cols-3 gap-6 md:gap-8">
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm border border-border/30 rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-accent/20 rounded-full mb-4 inline-block">
              <Gamepad2 className="h-10 w-10 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold">Start Practice Game</CardTitle>
            <Badge variant="outline" className="mt-1 bg-yellow-400/20 text-yellow-700 border-yellow-500">🚧 Under Construction</Badge>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full" size="lg" disabled>
              Play Solo
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm border border-border/30 rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-primary/20 rounded-full mb-4 inline-block">
              <UsersRound className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create Multiplayer Room</CardTitle>
            <CardDescription>Host a game for your friends.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full" size="lg" onClick={handleCreateRoom} disabled={loading}>
              Create Room
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm border border-border/30 rounded-lg overflow-hidden">
          <CardHeader className="text-center items-center">
            <div className="p-3 bg-green-500/20 rounded-full mb-4 inline-block">
             <KeyRound className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Join Room</CardTitle>
            <CardDescription>Enter a Room ID to join a game.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input 
              type="text" 
              placeholder="Enter Room ID" 
              className="text-center h-12 text-base"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={6}
            />
            <Button variant="outline" className="w-full" size="lg" onClick={handleJoinRoom} disabled={loading}>
              Join Game
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* How to Play Section */}
      <section className="py-12 md:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">How to Play HousieHub</h2>
          <p className="text-muted-foreground mt-2 text-lg">Simple steps to enjoy the game!</p>
        </div>
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full max-w-3xl mx-auto space-y-4">
          {howToPlaySteps.map((step, index) => (
            <AccordionItem value={`item-${index}`} key={index} className="bg-card/50 border border-border/30 rounded-lg shadow-sm">
              <AccordionTrigger className="text-xl font-semibold p-6 hover:no-underline">
                <div className="flex items-center space-x-4">
                  <step.icon className="h-7 w-7 text-primary" />
                  <span>{step.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed p-6 pt-0 pl-16 text-muted-foreground">
                {step.description}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Why Play With Us? Section */}
      <section className="py-12 md:py-16 bg-secondary/20 rounded-xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Why Play With Us?</h2>
          <p className="text-muted-foreground mt-2 text-lg">The best Housie experience, tailored for you.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {whyPlayWithUsFeatures.map((feature, index) => (
            <Card key={index} className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4 mb-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground">{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action / Footer Placeholder */}
      <section className="text-center py-16">
        <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
        <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
          Create an account or log in to start your Housie adventure. Invite your friends and let the fun begin!
        </p>
        {!currentUser && !loading && (
          <Link href="/auth/register" passHref>
            <Button size="lg" className="px-10 py-3 text-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white transform transition-all hover:scale-105 shadow-lg">
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        )}
         {currentUser && (
          <Button size="lg" className="px-10 py-3 text-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white transform transition-all hover:scale-105 shadow-lg" onClick={handleCreateRoom}>
              Host a New Game <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
        )}
      </section>
    </div>
  );
}
