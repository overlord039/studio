
"use client";

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, AlertTriangle, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
  );

export default function LoginSelectionScreen() {
  const { loginWithGoogle, loginAsGuest, isSigningIn } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  
  const anySignInInProgress = !!isSigningIn;
  const canProceed = agreedToTerms && agreedToPrivacy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('/bgpc2.png')" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <Card className="w-full max-w-sm text-center animate-fade-in-up bg-black/50 backdrop-blur-md border border-white/20 relative">
        <CardContent className="p-8 space-y-6">
          <h1 className="text-2xl font-bold text-white">Welcome to HousieHub</h1>
          
           <div className="space-y-4 pt-4 text-left bg-black/20 p-4 rounded-lg border border-white/10">
            <ScrollArea className="h-24 w-full rounded-md border border-white/20 bg-black/20 p-3 text-xs text-gray-300">
              <p className="font-bold mb-2">Terms of Service & Privacy Policy</p>
              <p>By using HousieHub, you agree to our Terms of Service and Privacy Policy. You must be at least 13 years old. We collect your display name, email, and gameplay statistics to improve your experience. We do not allow real money gambling. Please play fairly. For full details, please visit the links below.</p>
               <div className="mt-2 flex gap-4">
                 <Link href="/legal/user-agreement" target="_blank" className="underline hover:text-primary">User Agreement</Link>
                 <Link href="/legal/privacy-policy" target="_blank" className="underline hover:text-primary">Privacy Policy</Link>
               </div>
            </ScrollArea>
            <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(!!checked)} className="border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor="terms" className="text-xs text-gray-300">I agree to the User Agreement.</Label>
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox id="privacy" checked={agreedToPrivacy} onCheckedChange={(checked) => setAgreedToPrivacy(!!checked)} className="border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor="privacy" className="text-xs text-gray-300">I agree to the Privacy Policy.</Label>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button variant="outline" size="lg" className="w-full bg-white text-black hover:bg-gray-200" onClick={loginWithGoogle} disabled={anySignInInProgress || !canProceed}>
              {isSigningIn === 'google' && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              <GoogleIcon className="mr-2 h-5 w-5 fill-current" />
              {isSigningIn === 'google' ? "Signing in..." : "Continue with Google"}
            </Button>
            
            <div className="relative">
                <Separator className="my-4" />
                <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-black/50 px-2 text-xs uppercase text-gray-300">OR</span>
            </div>

            <Button variant="default" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={loginAsGuest} disabled={anySignInInProgress || !canProceed}>
              {isSigningIn === 'guest' && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSigningIn === 'guest' ? "Entering..." : "Play as Guest"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
