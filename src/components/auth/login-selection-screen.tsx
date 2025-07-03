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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center animate-fade-in-up bg-black/50 backdrop-blur-md border border-white/20">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Welcome to HousieHub</h1>
          
          <div className="space-y-3 pt-4">
            <Button className="w-full" size="lg" onClick={() => router.push('/auth/login')}>Login</Button>
            <Button variant="secondary" className="w-full" size="lg" onClick={() => router.push('/auth/register')}>Register</Button>
          </div>

          <div className="relative py-2">
            <Separator className="bg-white/20" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-black/50 px-2 text-xs text-gray-300">OR</span>
          </div>

          <Button variant="default" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleGuest}>
            Play as Guest
          </Button>
          
          <p className="text-xs text-gray-300 px-4 pt-4">
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
