"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCheck, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CompliancePage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <BookCheck className="mr-3 h-8 w-8 text-primary" /> Legal & Compliance
          </CardTitle>
          <CardDescription>
            Our commitment to legal and ethical standards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>HousieHub is operated as a free-to-play entertainment service. We are committed to complying with all applicable laws and regulations in the jurisdictions where we operate.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">1. Not a Gambling Platform</h3>
            <p>HousieHub does not involve real money wagering, betting, or any form of gambling. The "ticket prices" and "prize pools" mentioned in the game are for simulation and entertainment purposes only. No real money is ever exchanged, won, or lost.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. Age Restrictions</h3>
            <p>While our service is free-to-play, users must be at least 13 years of age or the minimum age required by law in their jurisdiction to create an account.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Intellectual Property</h3>
            <p>The HousieHub name, logo, and all related assets are the property of HousieHub. They may not be used without our express written permission.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Reporting Violations</h3>
            <p>If you believe any content or conduct on our platform violates our policies or the law, please report it to our support team for review.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push('/?settings=open&tab=about')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
