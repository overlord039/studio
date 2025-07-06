
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.854 3.187-1.782 4.133-1.147 1.147-2.933 2.4-5.11 2.4-4.333 0-7.84-3.52-7.84-7.84s3.507-7.84 7.84-7.84c2.44 0 4.007 1.013 4.907 1.947l2.6-2.6C18.067.733 15.447 0 12.48 0 5.867 0 .333 5.393.333 12s5.534 12 12.147 12c3.553 0 6.227-1.173 8.24-3.253 2.133-2.133 2.84-5.24 2.84-7.667 0-.76-.053-1.467-.173-2.133H12.48z" />
    </svg>
  );

export default function LoginSelectionScreen() {
  const { loginWithGoogle, loginAsGuest, isSigningIn } = useAuth();
  
  const firebaseConfigured = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!firebaseConfigured) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('/bgpc2.png')" }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            <Card className="w-full max-w-sm text-center animate-fade-in-up bg-destructive border-white/20 relative">
                 <CardHeader>
                    <CardTitle className="flex items-center justify-center text-destructive-foreground">
                        <AlertTriangle className="mr-2 h-6 w-6"/> Configuration Error
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 text-destructive-foreground">
                    <p>
                        Firebase API keys are missing.
                    </p>
                    <p className="text-sm mt-2">
                        Please add your project credentials to the <strong>.env</strong> file to enable authentication.
                    </p>
                </CardContent>
            </Card>
        </div>
      );
  }

  const anySignInInProgress = !!isSigningIn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('/bgpc2.png')" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <Card className="w-full max-w-sm text-center animate-fade-in-up bg-black/50 backdrop-blur-md border border-white/20 relative">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Welcome to HousieHub</h1>
          
          <div className="space-y-3 pt-4">
            <Button className="w-full bg-white text-black hover:bg-gray-200 shadow-sm" size="lg" onClick={loginWithGoogle} disabled={anySignInInProgress}>
              {isSigningIn === 'google' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5 fill-current" />}
              {isSigningIn === 'google' ? "Redirecting..." : "Sign in with Google"}
            </Button>
          </div>

          <div className="relative py-2">
            <Separator className="bg-white/20" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-black/50 px-2 text-xs text-gray-300">OR</span>
          </div>

          <Button variant="default" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={loginAsGuest} disabled={anySignInInProgress}>
            {isSigningIn === 'guest' && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSigningIn === 'guest' ? "Entering..." : "Play as Guest"}
          </Button>
          
          <p className="text-xs text-gray-300 px-4 pt-4">
            By continuing, you agree to our{' '}
            <Link href="/legal/user-agreement" className="underline hover:text-primary">
              User Agreement
            </Link> and {' '}
            <Link href="/legal/privacy-policy" className="underline hover:text-primary">
              Privacy Policy
            </Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
