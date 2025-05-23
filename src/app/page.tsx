
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, Users, LogIn as LogInIcon, Info } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12 bg-gradient-to-r from-primary to-accent rounded-lg shadow-xl">
        <h1 className="text-5xl font-extrabold text-primary-foreground mb-4">Welcome to HousieHub!</h1>
        <p className="text-xl text-primary-foreground/90 mb-8">
          Play the classic game of Housie (Tambola/Bingo) online with friends and family.
        </p>
        <div className="space-x-4">
          <Link href="/auth/login" passHref>
            <Button size="lg" variant="secondary">
              <LogInIcon className="mr-2 h-5 w-5" /> Login
            </Button>
          </Link>
          <Link href="/auth/register" passHref>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Users className="mr-2 h-5 w-5" /> Register
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <PlayCircle className="mr-3 text-accent h-8 w-8" />
              Start a Game
            </CardTitle>
            <CardDescription>Choose how you want to play.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled>
              Start Practice Game (Under Construction)
            </Button>
            <Link href="/create-room" passHref className="block">
              <Button className="w-full" size="lg">Create Multiplayer Room</Button>
            </Link>
            <div className="space-y-2">
              <Input type="text" placeholder="Enter Room ID" className="text-base"/>
              <Button variant="outline" className="w-full" size="lg" onClick={() => alert('Join Room functionality to be implemented.')}>
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Info className="mr-3 text-accent h-8 w-8" />
              How to Play Housie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg">What is Housie?</AccordionTrigger>
                <AccordionContent className="text-base">
                  Housie, also known as Tambola or Bingo, is a game of chance. The caller calls out numbers one at a time. Players mark these numbers on their tickets.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg">Game Objective</AccordionTrigger>
                <AccordionContent className="text-base">
                  The objective is to be the first to mark off all numbers for a specific winning pattern (e.g., Jaldi 5, Top Line, Full House).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg">Winning Patterns</AccordionTrigger>
                <AccordionContent className="text-base">
                  Common patterns include:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Jaldi 5:</strong> First 5 numbers marked on any ticket.</li>
                    <li><strong>Top Line:</strong> All numbers in the top row of a ticket.</li>
                    <li><strong>Middle Line:</strong> All numbers in the middle row of a ticket.</li>
                    <li><strong>Bottom Line:</strong> All numbers in the bottom row of a ticket.</li>
                    <li><strong>Full House:</strong> All 15 numbers on a ticket.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg">Playing on HousieHub</AccordionTrigger>
                <AccordionContent className="text-base">
                  Create or join a room, get your tickets, and mark numbers as they are called. Use the "Claim" buttons when you achieve a winning pattern!
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
