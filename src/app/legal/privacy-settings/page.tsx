import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function PrivacySettingsPage() {
  
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <SlidersHorizontal className="mr-3 h-8 w-8 text-primary" /> Privacy Settings
          </CardTitle>
          <CardDescription>
            Manage your privacy and data preferences for your HousieHub account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold">Account Visibility</h3>
                <p className="text-muted-foreground mt-1">
                    Your username is always visible to other players within the game rooms you join. This is essential for gameplay. There are currently no other public profile pages.
                </p>
            </div>
            <div>
                <h3 className="text-xl font-semibold">Data Management</h3>
                <p className="text-muted-foreground mt-1">
                    If you wish to delete your account and all associated data, please contact our support team. This action is irreversible.
                </p>
                <Link href="/legal/support">
                    <Button variant="link" className="px-0">Go to Support</Button>
                </Link>
            </div>
             <div>
                <h3 className="text-xl font-semibold">Communication</h3>
                <p className="text-muted-foreground mt-1">
                    We may occasionally send you emails regarding important service updates. We do not currently have a newsletter or promotional email list.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
