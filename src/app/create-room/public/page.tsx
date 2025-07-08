
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import type { Player, Room, GameSettings } from "@/types";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePublicRoomPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState("creating"); // 'creating', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to be ready
    }

    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to create or join a public room.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }

    const createPublicRoom = async () => {
      const hostPlayer: Player = {
        id: currentUser.uid,
        name: currentUser.displayName || 'Guest',
        email: currentUser.email,
        isHost: true,
      };

      const roomSettings: Partial<GameSettings> = {
        isPublic: true,
        callingMode: 'auto', // Public rooms are always auto
      };

      try {
        const response = await fetch('/api/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: hostPlayer, settings: roomSettings }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to create room: ${response.statusText}`);
        }

        const newRoom: Room = await response.json();
        
        playSound('notification.wav');
        toast({
          title: "Public Room Created!",
          description: `Joining room ${newRoom.id}.`,
        });
        router.push(`/room/${newRoom.id}/lobby`);

      } catch (error) {
        console.error("Error creating public room:", error);
        setErrorMessage((error as Error).message || "Could not create a public room. Please try again.");
        setStatus("error");
      }
    };

    createPublicRoom();
  }, [currentUser, authLoading, router, toast]);

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4 text-center">
      {status === "creating" && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold text-white">Creating Public Game...</h1>
          <p className="text-white/80 mt-2 text-base">Please wait while we set things up for you.</p>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive">Failed to Create Room</h1>
          <p className="text-white/80 mt-2 text-base">{errorMessage}</p>
          <Button onClick={() => router.push('/')} className="mt-6">
            Back to Home
          </Button>
        </>
      )}
    </div>
  );
}
