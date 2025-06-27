import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, Mail, MessageSquare } from "lucide-react";

export default function SupportPage() {
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
      </Card>
    </div>
  );
}
