
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ClipboardCopy, Users, Play, LogOut, रुपये, Gift } from "lucide-react"; // रुपये is not in lucide, using generic Gift
import type { Player, GameSettings, PrizeType } from "@/types";
import { PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES } from "@/lib/constants";
import React, { useEffect, useState } from "react";

// Mock data - replace with actual data fetching and state management
const mockPlayers: Player[] = [
  { id: "1", name: "Alice (Host)", isHost: true },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
];

export default function LobbyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;

  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [players, setPlayers] = useState<Player[]>(mockPlayers); // Initialize with mock players

  useEffect(() => {
    const ticketPrice = parseInt(searchParams.get('ticketPrice') || '10', 10) as GameSettings['ticketPrice'];
    const lobbySize = parseInt(searchParams.get('lobbySize') || '10', 10);
    const prizeFormat = (searchParams.get('prizeFormat') || 'Format 1') as GameSettings['prizeFormat'];
    
    if (ticketPrice && lobbySize && prizeFormat) {
      setGameSettings({ ticketPrice, lobbySize, prizeFormat });
    }
  }, [searchParams]);


  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Invite Link Copied!", description: "Share it with your friends." });
  };

  const handleStartGame = () => {
    // For now, just navigate to a mock game page
    toast({ title: "Game Starting (Mock)!", description: `Navigating to game room ${roomId}.` });
    router.push(`/room/${roomId}/play`);
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
  const totalPrizePool = gameSettings.ticketPrice * players.length; // Assuming all players bought 1 ticket for simplicity

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lobby: #{roomId}</CardTitle>
          <CardDescription>Waiting for players to join. Game will start when the host decides or lobby is full.</CardDescription>
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

          {/* Player List */}
          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Players ({players.length}/{gameSettings.lobbySize})
            </h3>
            <ul className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
              {players.map(player => (
                <li key={player.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span>{player.name}</span>
                  {player.isHost && <span className="text-xs font-semibold text-primary">(Host)</span>}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Prize Distribution */}
           <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
                <Gift className="mr-2 h-5 w-5 text-primary" /> Prize Distribution (Estimated)
            </h3>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 space-y-2">
                 <p className="text-sm text-muted-foreground">Total Pool (if lobby full): ₹{gameSettings.ticketPrice * gameSettings.lobbySize}</p>
                {prizesForFormat.map((prizeName) => {
                  const percentage = prizeDistribution[prizeName as PrizeType] || 0;
                  const prizeAmount = (totalPrizePool * percentage) / 100;
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


          {/* Only host can start game, assuming first player is host for mock */}
          {players.find(p => p.isHost) && (
            <Button onClick={handleStartGame} size="lg" className="w-full mt-4">
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
