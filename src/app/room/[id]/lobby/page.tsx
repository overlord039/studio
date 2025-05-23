
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, Gift, Ticket } from "lucide-react";
import type { Player, GameSettings, PrizeType } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES } from "@/lib/constants";
import React, { useEffect, useState } from "react";

// Mock data - replace with actual data fetching and state management
const initialHostPlayer: Player = { id: "hostUser123", name: "You (Host)", isHost: true, ticketsToBuy: 1 };

const MAX_TICKETS_PER_PLAYER = 6;

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const roomId = routeParams.id as string;

  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [players, setPlayers] = useState<Player[]>([initialHostPlayer]); // Start with only the host
  const [hostTicketSelection, setHostTicketSelection] = useState<number>(initialHostPlayer.ticketsToBuy || 1);

  useEffect(() => {
    const ticketPrice = parseInt(searchParams.get('ticketPrice') || '10', 10) as GameSettings['ticketPrice'];
    const lobbySize = parseInt(searchParams.get('lobbySize') || '10', 10);
    const prizeFormat = (searchParams.get('prizeFormat') || 'Format 1') as GameSettings['prizeFormat'];
    
    if (ticketPrice && lobbySize && prizeFormat) {
      setGameSettings({ ticketPrice, lobbySize, prizeFormat });
    }
     // In a real app, you'd fetch player list for the room or manage this via websockets
     // For this mock, we just initialize with the host.
  }, [searchParams]);

  const hostPlayer = players.find(p => p.isHost);

  const handleConfirmHostTickets = () => {
    if (hostPlayer) {
      setPlayers(prevPlayers =>
        prevPlayers.map(p =>
          p.id === hostPlayer.id ? { ...p, ticketsToBuy: hostTicketSelection } : p
        )
      );
      toast({
        title: "Tickets Confirmed",
        description: `You (host) will play with ${hostTicketSelection} ticket(s).`,
      });
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Invite Link Copied!", description: "Share it with your friends." });
  };

  const handleStartGame = () => {
    toast({ title: "Game Starting (Mock)!", description: `Navigating to game room ${roomId}.` });
    router.push(`/room/${roomId}/play?playerTickets=${hostTicketSelection}`);
  };

  const handleLeaveRoom = () => {
    toast({ title: "Left Room (Mock)", description: "You have left the lobby." });
    router.push("/");
  };

  if (!gameSettings) {
    return <div className="text-center py-10">Loading room details...</div>;
  }

  const currentPrizeFormat = gameSettings.prizeFormat || "Format 1";
  const prizesForFormat = PRIZE_DEFINITIONS[currentPrizeFormat];
  const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[currentPrizeFormat];
  
  const totalTicketsBought = players.reduce((sum, player) => sum + (player.ticketsToBuy || 0), 0);
  const currentTotalPrizePool = gameSettings.ticketPrice * totalTicketsBought;

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lobby: #{roomId}</CardTitle>
          <CardDescription>Waiting for players. Set your tickets and the host can start the game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p><strong>Ticket Price:</strong> ₹{gameSettings.ticketPrice}</p>
              <p><strong>Max Players:</strong> {gameSettings.lobbySize}</p>
              <p><strong>Prize Format:</strong> {gameSettings.prizeFormat}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={handleCopyInviteLink} variant="outline" className="w-full sm:w-auto">
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Invite Link
              </Button>
              <Button onClick={handleLeaveRoom} variant="destructive" className="w-full sm:w-auto">
                <LogOut className="mr-2 h-4 w-4" /> Leave Room
              </Button>
            </div>
          </div>

          {hostPlayer && (
            <Card className="bg-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5 text-primary"/>Your Tickets (Host)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <Select
                  value={String(hostTicketSelection)}
                  onValueChange={(value) => setHostTicketSelection(Number(value))}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_TICKETS_PER_PLAYER }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>
                        {num} ticket(s)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleConfirmHostTickets} className="w-full sm:w-auto">
                  Confirm My Tickets
                </Button>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Players ({players.length}/{gameSettings.lobbySize})
            </h3>
            <ul className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
              {players.map(player => (
                <li key={player.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span>{player.name} ({player.ticketsToBuy || 0} ticket{ (player.ticketsToBuy || 0) === 1 ? '' : 's'})</span>
                  {player.isHost && <span className="text-xs font-semibold text-primary">(Host)</span>}
                </li>
              ))}
              {players.length === 0 && <li className="text-muted-foreground">No players yet.</li>}
               {/* In a real app, this list would update as players join */}
            </ul>
          </div>
          
           <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
                <Gift className="mr-2 h-5 w-5 text-primary" /> Prize Distribution
            </h3>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 space-y-2">
                 <p className="text-sm font-semibold">Current Total Prize Pool: ₹{currentTotalPrizePool.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground">
                   (Max possible pool if lobby full & each player buys {MAX_TICKETS_PER_PLAYER} tickets: ₹{(gameSettings.ticketPrice * gameSettings.lobbySize * MAX_TICKETS_PER_PLAYER).toFixed(2)})
                 </p>
                {prizesForFormat.map((prizeName) => {
                  const percentage = prizeDistribution[prizeName as PrizeType] || 0;
                  const prizeAmount = (currentTotalPrizePool * percentage) / 100;
                  return (
                    <div key={prizeName} className="flex justify-between items-center text-sm">
                      <span>{prizeName}:</span>
                      <span className="font-semibold">₹{prizeAmount.toFixed(2)} ({percentage}%)</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {hostPlayer && (
            <Button onClick={handleStartGame} size="lg" className="w-full mt-4" disabled={players.length < 2 || totalTicketsBought === 0}>
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}
          {hostPlayer && (players.length < 2 || totalTicketsBought === 0) && (
            <p className="text-center text-sm text-destructive mt-2">
              {totalTicketsBought === 0 ? "At least one player needs to have tickets to start." : "Need at least 2 players to start the game."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
