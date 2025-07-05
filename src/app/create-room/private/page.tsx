
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { TICKET_PRICES, MIN_LOBBY_SIZE, MAX_LOBBY_SIZE, DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import type { TicketPrice, Player, Room, GameSettings } from "@/types";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const createRoomFormSchema = z.object({
  ticketPrice: z.coerce.number().refine(price => TICKET_PRICES.includes(price as TicketPrice), {
    message: "Invalid ticket price.",
  }),
  lobbySize: z.coerce.number().min(MIN_LOBBY_SIZE, `Minimum lobby size is ${MIN_LOBBY_SIZE}.`).max(MAX_LOBBY_SIZE, `Maximum lobby size is ${MAX_LOBBY_SIZE}.`),
  numberOfTicketsPerPlayer: z.coerce.number().min(1, 'Each player must have at least 1 ticket.').max(4, 'Maximum 4 tickets per player.'),
});

type CreateRoomFormValues = z.infer<typeof createRoomFormSchema>;

export default function CreatePrivateRoomPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomFormSchema),
    defaultValues: {
      ticketPrice: DEFAULT_GAME_SETTINGS.ticketPrice,
      lobbySize: DEFAULT_GAME_SETTINGS.lobbySize,
      numberOfTicketsPerPlayer: DEFAULT_GAME_SETTINGS.numberOfTicketsPerPlayer,
    },
  });

  async function onSubmit(values: CreateRoomFormValues) {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to create a room.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    const hostPlayer: Player = {
      id: currentUser.uid, 
      name: currentUser.displayName || 'Guest',
      email: currentUser.email,
      isHost: true,
    };

    const roomSettings: Partial<GameSettings> = {
      ticketPrice: values.ticketPrice,
      lobbySize: values.lobbySize,
      numberOfTicketsPerPlayer: values.numberOfTicketsPerPlayer,
      isPublic: false, // Private game
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
      
      toast({
        title: "Private Room Created!",
        description: `Room ID: ${newRoom.id}. Share this ID with friends!`,
      });
      router.push(`/room/${newRoom.id}/lobby`);

    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <Settings className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Private Game</CardTitle>
          <CardDescription>Set up your private game and invite friends!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ticketPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Price (₹)</FormLabel>
                    <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        defaultValue={String(field.value)}
                        disabled={isSubmitting || authLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ticket price" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TICKET_PRICES.map(price => (
                          <SelectItem key={price} value={String(price)}>₹{price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lobbySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lobby Size (Max Players)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`e.g., ${DEFAULT_GAME_SETTINGS.lobbySize}`} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                        disabled={isSubmitting || authLoading}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfTicketsPerPlayer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tickets Per Player (Default)</FormLabel>
                    <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        defaultValue={String(field.value)}
                        disabled={isSubmitting || authLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default tickets per player" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4].map(num => (
                          <SelectItem key={num} value={String(num)}>{num} ticket(s)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || authLoading}>
                {isSubmitting ? "Creating Room..." : "Create Room"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
