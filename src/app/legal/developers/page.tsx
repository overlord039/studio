
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, Mail, Heart, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Developer Note | Housie with Friends",
  description: "Learn why this Housie platform was built using technology to bring families and friends closer while enjoying Housie online.",
};

export default function DevelopersPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in-up">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-bold">
            🎉 Developer Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6 px-8 py-6 text-lg text-card-foreground/80">
          <p>
            Hi, I’m <span className="font-semibold text-primary">Durga Sankar</span>, the developer of this Housie platform.
          </p>
          <p>
            This is my original idea, built using AI tools to streamline development. My goal was simple: to help families and friends play Housie easily, whether they are near or far.
          </p>
          <p>
            With advancements in technology, I wanted to recreate the warmth of sitting together with tickets, calling numbers, and claiming prizes, now seamlessly online.
          </p>
          <p>
            I believe technology should bring people closer, and this is my small step toward that goal.
          </p>
          <p>
            Thank you for playing and supporting the platform.
          </p>
          <p className="font-semibold text-xl pt-2">– Durga Sankar</p>
          
          <div className="border-t pt-6 space-y-2">
            <p className="text-sm">
              Feel free to reach out if you have ideas, suggestions, or wish to collaborate.
            </p>
            <div className="flex justify-center items-center space-x-6">
              <a href="[Your LinkedIn URL]" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-7 w-7" />
              </a>
              <a href="mailto:[Your Email Address]" aria-label="Email" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-7 w-7" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center mt-8 space-y-4">
          <p className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <span>This site was built with</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>using React, Node.js, and AI-assisted tools.</span>
          </p>
          <Link href="/" passHref>
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Button>
          </Link>
      </div>
    </div>
  );
}
