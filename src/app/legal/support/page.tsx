"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <LifeBuoy className="mr-3 h-8 w-8 text-primary" /> Support Center
          </CardTitle>
          <CardDescription>
            We're here to help! Find answers to your questions and get in touch with our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center"><Mail className="mr-2 h-5 w-5 text-accent" /> Email Support</h3>
            <p className="text-muted-foreground">
              For general inquiries, technical issues, or feedback, please email us. We aim to respond within 24-48 hours.
            </p>
            <a href="mailto:support@housiehub.com" className="text-primary font-medium hover:underline">
              support@housiehub.com
            </a>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-accent" /> Live Chat (Coming Soon)</h3>
            <p className="text-muted-foreground">
              Soon, you'll be able to chat with our support agents in real-time for instant assistance during business hours.
            </p>
          </div>
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
