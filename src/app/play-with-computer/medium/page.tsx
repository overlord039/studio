
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Player, Room } from "@/types";
import { Bot, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useSound } from "@/contexts/sound-context";

const mediumModeFormSchema = z.object({
  numberOfTickets: z.coerce.number().min(1).max(4),
});

type MediumModeFormValues = z.infer<typeof mediumModeFormSchema>;

export default function MediumModePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { playSound } = useSound();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MediumModeFormValues>({
    resolver: zodResolver(mediumModeFormSchema),
    defaultValues: {
      numberOfTickets: 1,
    },
  });

  async function onSubmit(values: MediumModeFormValues) {
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
        body: JSON.stringify({ host: hostPlayer, mode: 'medium', tickets: values.numberOfTickets }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create bot game.");
      }

      const newRoom: Room = await response.json();
      toast({ title: "Game Starting!", description: "Get ready to play against the bots!" });
      router.push(`/room/${newRoom.id}/play?playerTickets=${values.numberOfTickets}`);

    } catch (error) {
      console.error("Error creating bot game:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-12 px-4">
      <Card className="w-full max-w-md shadow-xl border-accent">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center gap-2 mb-4">
            <Bot className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-3xl font-bold">Classic</CardTitle>
          <CardDescription>Choose your tickets. The bots' tickets will be random.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="numberOfTickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Tickets</FormLabel>
                    <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        defaultValue={String(field.value)}
                        disabled={isSubmitting || authLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tickets" />
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
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Starting Game..." : "Start Game"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
