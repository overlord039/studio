
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { 
  Gamepad2, 
  UserPlus, 
  LogIn, 
  Ticket, 
  Volume2, 
  CheckSquare, 
  Trophy, 
  Star, 
  ThumbsUp, 
  Rocket, 
  HeartHandshake 
} from "lucide-react";

export default function HowToPlayPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Gamepad2 className="mr-3 h-8 w-8 text-primary" /> How to Play HousieHub
          </CardTitle>
          <CardDescription>
            Welcome to HousieHub, your fun place to play Housie (Tambola) with friends and family near and far! Here’s everything you need to know to start playing confidently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
            
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">1.</span> What is Housie?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                Housie (also known as Tambola) is a fun, number-based game where players mark off numbers on their tickets as they are called out, aiming to complete specific winning patterns to win prizes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">2.</span> Getting Started
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-2">
                <div className="flex items-start">
                  <UserPlus className="mr-2 mt-1 h-5 w-5 text-accent flex-shrink-0" />
                  <span><strong>Create an Account:</strong> Sign up with your email to create a profile. This allows you to create games, track your wins, and save your stats.</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">3.</span> Creating or Joining a Game
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-4">
                <div>
                  <h4 className="font-semibold flex items-center mb-2"><LogIn className="mr-2 h-5 w-5 text-accent"/>Create Room (as Host)</h4>
                  <p>Click "Create Room" and set the game options:</p>
                  <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                    <li>Ticket Price</li>
                    <li>Number of Players (Lobby Size)</li>
                    <li>Tickets per Player</li>
                    <li>Prize Format</li>
                    <li>Public (anyone can join) or Private (requires a code)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center mb-2"><LogIn className="mr-2 h-5 w-5 text-accent"/>Join Room (as Player)</h4>
                  <p>Click "Join Room" and enter the unique room code shared by your host to enter the lobby.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">4.</span> Getting Your Tickets
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-2">
                <div className="flex items-start">
                  <Ticket className="mr-2 mt-1 h-5 w-5 text-accent flex-shrink-0" />
                  <span>Once inside the room, buy your tickets. Each ticket has 15 random numbers in a 3x9 grid. You will see your ticket(s) on your screen once the game starts.</span>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">5.</span> Game Start & Number Calling
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-2">
                <div className="flex items-start">
                    <Volume2 className="mr-2 mt-1 h-5 w-5 text-accent flex-shrink-0" />
                    <span>The host or system will start the game. Numbers from 1 to 90 will be called randomly, one at a time. Called numbers are displayed on the Number Board and read aloud (enable sound for the best experience).</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">6.</span> Marking Your Numbers
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-2">
                <div className="flex items-start">
                    <CheckSquare className="mr-2 mt-1 h-5 w-5 text-accent flex-shrink-0" />
                    <span>As numbers are called, click or tap on the matching numbers on your ticket to mark them. Your marked numbers will be highlighted automatically.</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">7.</span> Claiming Prizes
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2 space-y-4">
                  <div>
                    <p>HousieHub supports multiple winning patterns:</p>
                    <ul className="list-none mt-2 ml-4 space-y-2">
                      <li className="flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" /><strong>Jaldi 5:</strong> First to mark any 5 numbers.</li>
                      <li className="flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" /><strong>Top Line:</strong> All 5 numbers in the top row.</li>
                      <li className="flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" /><strong>Middle Line:</strong> All 5 numbers in the middle row.</li>
                      <li className="flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" /><strong>Bottom Line:</strong> All 5 numbers in the bottom row.</li>
                      <li className="flex items-center"><Trophy className="mr-2 h-4 w-4 text-yellow-500" /><strong>Full House:</strong> All 15 numbers on your ticket.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center mb-2">When you complete a winning pattern:</h4>
                    <p>Click the "Claim Prize" button for that pattern. Claims are verified automatically. If valid, your claim is announced to all players, and your win is recorded.</p>
                  </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">8.</span> Game End
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                The game ends when all prizes are claimed or when the host ends it. You can view the results screen showing all winners and your stats for the game.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <span className="mr-2 text-primary">9.</span> Play Again!
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                After a game, the host can start a new one in the same room. Players can edit the number of tickets for the next game. New players can also join using the same room code.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-10">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <ThumbsUp className="mr-2 h-5 w-5 text-accent" /> Tips for a Fun Game
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-2 border-l-2 border-accent ml-2">
                 <ul className="list-disc list-inside space-y-1">
                    <li>Play with a good internet connection for seamless gameplay.</li>
                    <li>Use headphones for clear number calls.</li>
                    <li>Play responsibly and have fun!</li>
                    <li>Enjoy the game with family and friends, near or far!</li>
                  </ul>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-2xl font-bold flex items-center"><Rocket className="mr-3 h-8 w-8 text-primary" />Ready to Play?</h3>
            <div className="flex gap-4">
                <Link href="/create-room" passHref>
                    <Button>Create a Room</Button>
                </Link>
                <Link href="/" passHref>
                    <Button variant="secondary">Join a Room</Button>
                </Link>
            </div>
        </CardFooter>
      </Card>
      
      <Card className="shadow-xl">
          <CardHeader>
             <CardTitle className="text-2xl font-bold flex items-center">
                <HeartHandshake className="mr-3 h-8 w-8 text-primary" /> Why Play on HousieHub?
             </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-semibold mb-1">Real-Time Multiplayer</h4>
                <p className="text-sm text-muted-foreground">Enjoy smooth, fast games with friends and family.</p>
              </div>
               <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-semibold mb-1">Fair Ticket Generation</h4>
                <p className="text-sm text-muted-foreground">Unique, unbiased tickets every time.</p>
              </div>
               <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-semibold mb-1">Secure & Private</h4>
                <p className="text-sm text-muted-foreground">Your games, your rules.</p>
              </div>
               <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-semibold mb-1">Play Anywhere</h4>
                <p className="text-sm text-muted-foreground">Desktop, tablet, or mobile.</p>
              </div>
               <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-semibold mb-1">Light & Dark Modes</h4>
                <p className="text-sm text-muted-foreground">Play comfortably anytime.</p>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}

  