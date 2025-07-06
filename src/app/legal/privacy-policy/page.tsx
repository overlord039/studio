"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <ShieldCheck className="mr-3 h-8 w-8 text-primary" /> Privacy Policy
          </CardTitle>
          <CardDescription>
            Last Updated: May 24, 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">1. Information We Collect</h3>
            <p>We collect information you provide directly to us, such as when you create an account (username, email). We also collect information automatically as you use our services, such as game activity and device information. We do not collect real names or payment information.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. How We Use Information</h3>
            <p>We use the information we collect to operate and improve our services, personalize your experience, and communicate with you. Your username is visible to other players in game rooms.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Information Sharing</h3>
            <p>We do not sell your personal information. We may share information with third-party service providers who perform services on our behalf, such as hosting and analytics. Your username and in-game actions are public within the context of the game you are playing.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Data Security</h3>
            <p>We take reasonable measures to protect your information from unauthorized access, use, or disclosure. However, no internet-based service is 100% secure.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">5. Your Choices</h3>
            <p>You may update your account information at any time. You can also request deletion of your account by contacting our support team.</p>
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
