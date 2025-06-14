
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Info, Users, Ticket, CheckSquare, Volume2, Gift } from "lucide-react";

export default function HowToPlayPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <HelpCircle className="mr-3 h-8 w-8 text-primary" /> How to Play HousieHub
          </CardTitle>
          <CardDescription>
            Your simple guide to enjoying multiplayer Housie on our platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Ticket className="mr-2 h-5 w-5 text-accent" />
                Get Your Tickets
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                Once you join a game room in HousieHub, you&apos;ll automatically receive your virtual Housie tickets to play. The number of tickets per player is set by the room host, usually ranging from one to six. You can clearly see all your tickets displayed on the game screen, each with its unique set of numbers, ready for the game to begin!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Volume2 className="mr-2 h-5 w-5 text-accent" />
                Numbers Called
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                In HousieHub, numbers from 1 to 90 are called out automatically by the system one by one. The most recently called number is prominently displayed, and you can also see a board showing all numbers that have been called so far. For extra convenience, there&apos;s often a voice announcement for each number, and they are called at a steady pace so everyone can keep up.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <CheckSquare className="mr-2 h-5 w-5 text-accent" />
                Mark Your Numbers
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                As numbers are called, simply tap or click on the matching number on your digital ticket to mark it. HousieHub provides visual assistance, highlighting called numbers, but you&apos;ll need to do the marking yourself – there&apos;s no auto-marking. Marking your numbers correctly and promptly is key to spotting winning patterns and claiming prizes!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Gift className="mr-2 h-5 w-5 text-accent" />
                Claim Prizes
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                When you complete a winning pattern on any of your tickets, like Jaldi 5 (first five numbers), a Line (Top, Middle, or Bottom), or the grand Full House (all numbers), you must click the &quot;Claim&quot; button for that specific prize. The system will then instantly validate your claim. Be quick, as usually only the first valid claim for each prize wins!
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <Users className="mr-2 h-5 w-5 text-accent" />
                Play With Friends
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                Playing HousieHub with friends is easy! Simply create a private game room and share the unique Room ID or invite link with them. Your friends can then use this ID/link to join your room directly. Once everyone&apos;s in and has their tickets, the host can start the game for a fun, shared experience.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
