"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const supportEmail = "support@housiehub.com";

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <ShieldCheck className="mr-3 h-8 w-8 text-primary" /> HousieHub Privacy Policy
          </CardTitle>
          <CardDescription>
            Effective Date: July 6, 2025
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>HousieHub (“we”, “our”, “us”) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our app and services.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">Information We Collect</h3>
            <ul className="list-disc list-inside space-y-1">
                <li><strong>Account Information:</strong> Username, email address (optional if login used), and gameplay data.</li>
                <li><strong>Usage Data:</strong> Information about how you use the app for analytics and improvements.</li>
                <li><strong>Device Information:</strong> Device type, operating system, and crash logs to improve app performance.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground pt-4">How We Use Your Information</h3>
            <ul className="list-disc list-inside space-y-1">
                <li>To provide and maintain the HousieHub app and its features.</li>
                <li>To improve gameplay experience and add new features.</li>
                <li>To communicate with you about updates or promotions (optional, with your consent).</li>
                <li>For security and fraud prevention.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground pt-4">Sharing Your Information</h3>
            <p>We do not sell your personal information. We may share data with service providers who help us operate our app (analytics, hosting) under strict confidentiality.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">Data Security</h3>
            <p>We implement industry-standard measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">Your Choices</h3>
            <ul className="list-disc list-inside space-y-1">
                <li>You can request deletion of your account data at any time by contacting us at <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>.</li>
                <li>You can opt out of promotional notifications in your app settings.</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">Changes to This Policy</h3>
            <p>We may update this Privacy Policy, and the updated version will be posted here with a new effective date.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">Contact Us</h3>
            <div>
              <p>If you have questions about this Privacy Policy, contact us at:</p>
              <p className="font-medium">
                📧 <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
              </p>
              <p className="font-medium">📍 HousieHub, India</p>
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
