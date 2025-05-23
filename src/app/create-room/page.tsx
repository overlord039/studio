
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
import { TICKET_PRICES, PRIZE_FORMATS, MIN_LOBBY_SIZE, MAX_LOBBY_SIZE, DEFAULT_TICKET_PRICE, DEFAULT_LOBBY_SIZE, DEFAULT_PRIZE_FORMAT } from "@/lib/constants";
import type { TicketPrice, PrizeFormat } from "@/types";
import { Settings } from "lucide-react";

const createRoomFormSchema = z.object({
  ticketPrice: z.coerce.number().refine(price => TICKET_PRICES.includes(price as TicketPrice), {
    message: "Invalid ticket price.",
  }),
  lobbySize: z.coerce.number().min(MIN_LOBBY_SIZE, `Minimum lobby size is ${MIN_LOBBY_SIZE}.`).max(MAX_LOBBY_SIZE, `Maximum lobby size is ${MAX_LOBBY_SIZE}.`),
  prizeFormat: z.string().refine(format => PRIZE_FORMATS.includes(format as PrizeFormat), {
    message: "Invalid prize format.",
  }),
});

type CreateRoomFormValues = z.infer<typeof createRoomFormSchema>;

export default function CreateRoomPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomFormSchema),
    defaultValues: {
      ticketPrice: DEFAULT_TICKET_PRICE,
      lobbySize: DEFAULT_LOBBY_SIZE,
      prizeFormat: DEFAULT_PRIZE_FORMAT,
    },
  });

  async function onSubmit(values: CreateRoomFormValues) {
    console.log("Creating room with settings:", values);
    // In a real app, you'd send this to a backend to create the room
    // For now, we'll simulate room creation and navigate to a mock lobby
    
    const mockRoomId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    toast({
      title: "Room Created!",
      description: `Room ID: ${mockRoomId}. Settings: Price ₹${values.ticketPrice}, Size ${values.lobbySize}, Format ${values.prizeFormat}`,
    });
    router.push(`/room/${mockRoomId}/lobby?ticketPrice=${values.ticketPrice}&lobbySize=${values.lobbySize}&prizeFormat=${encodeURIComponent(values.prizeFormat)}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <Settings className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Housie Game</CardTitle>
          <CardDescription>Set up your game and invite friends!</CardDescription>
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
                      <Input type="number" placeholder={`e.g., ${DEFAULT_LOBBY_SIZE}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prizeFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prize Format</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select prize format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIZE_FORMATS.map(format => (
                          <SelectItem key={format} value={format}>{format} (Standard)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
