"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserAgreementPage() {
  const supportEmail = "support@housiehub.com";
  const router = useRouter();
  
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" /> HousieHub - Terms of Service
          </CardTitle>
          <CardDescription>
            Effective Date: May 24, 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Contact Email: <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a></p>
          <p>Welcome to HousieHub, your online multiplayer housie (tambola/bingo) platform to play with friends and family, near or far. Please read these Terms of Service carefully before using our app or website.</p>
          
          <h3 className="text-xl font-semibold text-foreground pt-4">1. Acceptance of Terms</h3>
          <p>By using HousieHub, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">2. Eligibility</h3>
          <p>You must be at least 13 years old to use HousieHub. If under 18, you must have permission from a parent or guardian.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">3. User Accounts</h3>
          <p>You may register using Google or as a guest. You agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your account.</p>
          
          <h3 className="text-xl font-semibold text-foreground pt-4">4. Gameplay & Usage</h3>
          <p>HousieHub allows you to purchase tickets and play housie games with others. We do not allow gambling with real money; prizes are within legal compliance as entry-fee-based rewards. You agree to play fairly and avoid cheating or manipulating the system.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">5. Prohibited Conduct</h3>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Use the platform for illegal purposes.</li>
            <li>Cheat or manipulate gameplay.</li>
            <li>Harass or abuse other players.</li>
            <li>Use automated systems to interact with HousieHub.</li>
            <li>Violate the intellectual property rights of HousieHub or others.</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground pt-4">6. Account Suspension</h3>
          <p>We reserve the right to suspend or terminate your account if you violate these Terms.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">7. Intellectual Property</h3>
          <p>All logos, branding, game designs, and content on HousieHub are the property of HousieHub and may not be used without permission.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">8. Limitation of Liability</h3>
          <p>HousieHub is provided “as is.” We do not guarantee uninterrupted service and are not liable for any damages resulting from your use of the app.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">9. Privacy & Data</h3>
          <p>We collect your display name, email, and gameplay statistics to improve your gaming experience. For more information, please see our Privacy Policy.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">10. Changes to Terms</h3>
          <p>We may update these Terms periodically. We will notify users of any significant changes.</p>

          <h3 className="text-xl font-semibold text-foreground pt-4">11. Contact</h3>
          <p>For questions, reach out at: <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a></p>

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
