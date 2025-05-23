
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { DEFAULT_TICKET_PRICE, DEFAULT_LOBBY_SIZE, DEFAULT_PRIZE_FORMAT } from "@/lib/constants";
import { PartyPopper } from "lucide-react"; // Changed icon to better suit a "create" action

export default function CreateRoomPage() {
  const { toast } = useToast();
  const router = useRouter();

  async function handleCreateRoom() {
    const ticketPrice = DEFAULT_TICKET_PRICE;
    const lobbySize = DEFAULT_LOBBY_SIZE;
    const prizeFormat = DEFAULT_PRIZE_FORMAT;

    console.log("Creating room with default settings:", { ticketPrice, lobbySize, prizeFormat });
    
    const mockRoomId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    toast({
      title: "Room Created!",
      description: `Room ID: ${mockRoomId}. Using default settings.`,
    });
    router.push(`/room/${mockRoomId}/lobby?ticketPrice=${ticketPrice}&lobbySize=${lobbySize}&prizeFormat=${encodeURIComponent(prizeFormat)}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Housie Game</CardTitle>
          <CardDescription>Start a new game with default settings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="text-sm text-muted-foreground mb-6 px-4 text-center">
            A new room will be created with standard rules: Ticket Price ₹{DEFAULT_TICKET_PRICE}, Max {DEFAULT_LOBBY_SIZE} Players.
          </p>
          <Button onClick={handleCreateRoom} className="w-full max-w-xs" size="lg">
            Create Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
