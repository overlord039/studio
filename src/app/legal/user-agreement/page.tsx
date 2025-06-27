import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function UserAgreementPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" /> User Agreement
          </CardTitle>
          <CardDescription>
            Last Updated: May 24, 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>Welcome to HousieHub. This User Agreement ("Agreement") is a legal agreement between you and HousieHub ("we", "us", or "our") that governs your use of our website and services.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">1. Acceptance of Terms</h3>
            <p>By accessing or using our services, you agree to be bound by this Agreement. If you do not agree to these terms, you may not use our services. HousieHub is provided for entertainment purposes only.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. User Conduct</h3>
            <p>You agree not to use the service for any unlawful purpose or to engage in any conduct that is harmful, offensive, or disruptive. This includes but is not limited to cheating, exploiting bugs, or harassing other users.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Accounts</h3>
            <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Termination</h3>
            <p>We may terminate or suspend your access to our service at any time, without prior notice or liability, for any reason, including if you breach this Agreement.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">5. Disclaimer of Warranties</h3>
            <p>The service is provided "as is" and "as available" without any warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free.</p>
        </CardContent>
      </Card>
    </div>
  );
}
