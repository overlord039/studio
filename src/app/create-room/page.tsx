
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { House, LogOut, VenetianMask } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { playSound } from '@/lib/sounds';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

type Mode = 'private';

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
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [joinRoomId, setJoinRoomId] = useState('');

  const options: GameOption[] = [
    {
      mode: 'private' as Mode,
      title: "Create Room",
      subtitle: "Host a new game for your friends",
      icon: House,
      description: "Set up a private game with custom rules and invite your friends to play.",
      disabled: false,
      href: "/create-room/private",
      iconBgColor: "bg-primary/20",
      iconTextColor: "text-primary",
    }
  ];
  
  const handleCardClick = (option: GameOption) => {
    playSound('cards.mp3');
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
      return;
    }
    
    router.push(option.href);
  };

  const handleJoinRoom = () => {
    playSound('cards.mp3');
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to join a room.",
        variant: "destructive",
      });
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

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Play with Friends</h1>
        <p className="text-white/80 mt-2 text-base">Create a new room or join an existing one.</p>
      </div>
      <div className="w-full max-w-xl space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><VenetianMask className="mr-2 h-5 w-5 text-primary"/> Join a Room</CardTitle>
                <CardDescription>Enter the Room ID given by the host.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex w-full items-center space-x-2">
                    <Input
                    id="join-room-input"
                    type="text"
                    placeholder="Enter Room ID"
                    className="h-10 text-sm"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    disabled={authLoading}
                    maxLength={6}
                    />
                    <Button variant="secondary" onClick={handleJoinRoom} disabled={authLoading}>
                    Join
                    </Button>
                </div>
            </CardContent>
        </Card>

        <div className="relative flex items-center justify-center">
            <div className="flex-grow border-t"></div>
            <span className="flex-shrink mx-4 text-xs uppercase text-white">OR</span>
            <div className="flex-grow border-t"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 md:max-w-sm mx-auto">
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
