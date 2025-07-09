
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Player, Room } from "@/types";
import { Bot, Skull, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { playSound } from "@/lib/sounds";

export default function HardModePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartGame = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    playSound('start.wav');

    const hostPlayer: Player = {
      id: currentUser.uid, 
      name: currentUser.displayName || 'Guest',
      email: currentUser.email,
    };

    try {
      const response = await fetch('/api/bot-game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: hostPlayer, mode: 'hard' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create bot game.");
      }

      const newRoom: Room = await response.json();
      toast({ title: "Hard Game Starting!", description: "Ticket counts are random. Good luck!" });
      
      const hostPlayerInRoom = newRoom.players.find(p => p.id === currentUser.uid);
      const hostTicketCount = hostPlayerInRoom?.tickets.length || 1;

      router.push(`/room/${newRoom.id}/play?playerTickets=${hostTicketCount}`);

    } catch (error) {
      console.error("Error creating bot game:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-xl text-center border-accent">
        <CardHeader>
           <div className="flex justify-center items-center gap-2 mb-4">
            <Bot className="h-12 w-12 text-primary" />
            <Skull className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-bold">Hard Mode</CardTitle>
          <CardDescription>Ticket counts for you and the bots will be randomized. Good luck!</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStartGame} className="w-full" size="lg" disabled={isSubmitting || authLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Setting Up..." : "Start Hard Mode Game"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
