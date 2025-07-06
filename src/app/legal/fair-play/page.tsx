"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FairPlayPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Scale className="mr-3 h-8 w-8 text-primary" /> Fair Play Policy
          </CardTitle>
          <CardDescription>
            Ensuring a level playing field for everyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>At HousieHub, we are committed to providing a fair and enjoyable gaming environment for all our players. Our systems are designed to ensure randomness and prevent cheating.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">1. Ticket Generation</h3>
            <p>All Housie tickets are generated using a provably fair algorithm that adheres to the standard rules of the game. Each ticket has a unique combination of numbers distributed across the grid according to established patterns.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. Number Calling</h3>
            <p>The sequence of called numbers is determined by a cryptographically secure random number generator. The sequence is generated before the game starts and cannot be influenced by any player or administrator.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Prize Validation</h3>
            <p>Prize claims are validated automatically by our server. The system checks a player's ticket against the list of called numbers at the time of the claim. The first valid claim for any prize is the one that is awarded.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Prohibited Conduct</h3>
            <p>The use of bots, scripts, or any form of automation to play the game or gain an unfair advantage is strictly prohibited. Players found to be in violation of this policy will have their accounts suspended.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
