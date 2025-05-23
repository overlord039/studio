
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Info } from "lucide-react";

export default function HowToPlayPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <HelpCircle className="mr-3 h-8 w-8 text-primary" /> How to Play HousieHub
          </CardTitle>
          <CardDescription>
            A quick guide to playing Housie (Tambola/Bingo) on our platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Info className="mr-2 h-5 w-5 text-accent" />
                The Basics
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                Housie (also known as Tambola or Bingo) is a game of probability. An organizer or caller calls out numbers one at a time. Players strike those numbers on their tickets if present. The goal is to be the first to claim a winning pattern.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Info className="mr-2 h-5 w-5 text-accent" />
                Getting Started
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li><strong>Register/Login:</strong> Create an account or log in to HousieHub.</li>
                  <li><strong>Create or Join a Room:</strong> You can host your own game by creating a room and setting parameters like ticket price and lobby size, or join an existing room using a Room ID.</li>
                  <li><strong>Get Your Tickets:</strong> Once in a room, you'll receive your Housie tickets. You might be able to buy multiple tickets.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Info className="mr-2 h-5 w-5 text-accent" />
                Gameplay
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Number Calling:</strong> The system will automatically call out numbers one by one. These numbers will be displayed clearly and also marked on a live number board (1-90).</li>
                  <li><strong>Marking Tickets:</strong> Listen for the called numbers. If a called number is on your ticket, click/tap on it to mark it. Numbers can only be marked if they have been called.</li>
                  <li><strong>Winning Patterns:</strong> Common patterns include:
                    <ul className="list-disc list-inside pl-6 mt-1">
                      <li>Jaldi 5 / Early 5: First five numbers marked on your ticket.</li>
                      <li>Lines (Top, Middle, Bottom): All numbers in a specific row.</li>
                      <li>Full House: All 15 numbers on your ticket.</li>
                      <li>Other patterns may be available depending on the game settings (e.g., Corners, 1st Jaldi 5, 2nd Jaldi 5, etc.).</li>
                    </ul>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Info className="mr-2 h-5 w-5 text-accent" />
                Claiming Prizes
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                When you complete a winning pattern on your ticket:
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>Manually Claim:</strong> You must press the "Claim" button corresponding to the prize (e.g., "Claim Top Line").</li>
                  <li><strong>Validation:</strong> The system will automatically validate your claim. If it's valid and you're the first, you win that prize!</li>
                  <li><strong>No Auto-Claiming:</strong> The system will not automatically claim prizes for you.</li>
                  <li><strong>One Winner Per Prize:</strong> Generally, only the first valid claim for a specific prize is accepted (unless specified otherwise for certain formats like shared prizes).</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Info className="mr-2 h-5 w-5 text-accent" />
                Game End
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                The game usually ends when the Full House (or the final specified prize) is claimed. A summary of winners for different prizes will be shown.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
