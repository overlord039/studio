
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { TicketPrice, PrizeFormat } from "@/types";
import { TICKET_PRICES, PRIZE_FORMATS, MIN_LOBBY_SIZE, MAX_LOBBY_SIZE, DEFAULT_TICKET_PRICE, DEFAULT_LOBBY_SIZE, DEFAULT_PRIZE_FORMAT } from "@/lib/constants";
import { Settings } from "lucide-react";

const formSchema = z.object({
  ticketPrice: z.coerce.number().refine(val => TICKET_PRICES.includes(val as TicketPrice), {
    message: "Invalid ticket price.",
  }),
  lobbySize: z.coerce.number().min(MIN_LOBBY_SIZE, `Lobby size must be at least ${MIN_LOBBY_SIZE}.`).max(MAX_LOBBY_SIZE, `Lobby size cannot exceed ${MAX_LOBBY_SIZE}.`),
  prizeFormat: z.string().refine(val => PRIZE_FORMATS.includes(val as PrizeFormat), {
    message: "Invalid prize format.",
  }),
});

export default function CreateRoomPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticketPrice: DEFAULT_TICKET_PRICE,
      lobbySize: DEFAULT_LOBBY_SIZE,
      prizeFormat: DEFAULT_PRIZE_FORMAT,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Create room settings:", values);
    // In a real app, this would call a server action to create the room
    // For now, simulate room creation and navigate to a mock lobby
    const mockRoomId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    toast({
      title: "Room Created (Mock)",
      description: `Room ID: ${mockRoomId}. Settings: Ticket ₹${values.ticketPrice}, Size ${values.lobbySize}, Format: ${values.prizeFormat}`,
    });
    router.push(`/room/${mockRoomId}/lobby?ticketPrice=${values.ticketPrice}&lobbySize=${values.lobbySize}&prizeFormat=${encodeURIComponent(values.prizeFormat)}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Settings className="mr-3 h-8 w-8 text-primary" /> Create Game Room
          </CardTitle>
          <CardDescription>Set up the rules for your Housie game.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="ticketPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Price (₹)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
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
                    <FormDescription>
                      The cost for each ticket in the game.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lobbySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lobby Size</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={`e.g., ${DEFAULT_LOBBY_SIZE}`} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                    </FormControl>
                    <FormDescription>
                      Number of players allowed (between {MIN_LOBBY_SIZE} and {MAX_LOBBY_SIZE}).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prizeFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Winning Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select prize format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIZE_FORMATS.map(format => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormDescription>
                      Choose the set of winning combinations for this game.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg">
                Create Room
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
