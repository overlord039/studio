
"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';

export default function LoginSelectionScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  const handleGuest = () => {
    const guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
    login({ username: guestUsername, email: `${guestUsername}@guest.com` });
    // After login, the PageLayout will re-render and show the homepage.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm text-center animate-fade-in-up">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-2xl font-bold">Welcome to HousieHub</h1>
          
          <div className="space-y-3 pt-4">
            <Button className="w-full" size="lg" onClick={() => router.push('/auth/login')}>Login</Button>
            <Button variant="secondary" className="w-full" size="lg" onClick={() => router.push('/auth/register')}>Register</Button>
          </div>

          <div className="relative py-2">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
          </div>

          <Button variant="default" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleGuest}>
            Play as Guest
          </Button>
          
          <p className="text-xs text-muted-foreground px-4 pt-4">
            By continuing, you agree that HousieHub may store and process your data in accordance with the{' '}
            <Link href="/legal/privacy-policy" className="underline hover:text-primary">
              Privacy Policy
            </Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
