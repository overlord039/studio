import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Target, Gem } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Info className="mr-3 h-8 w-8 text-primary" /> About HousieHub
          </CardTitle>
          <CardDescription>
            Connecting friends and family through the classic game of Housie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center mb-2"><Target className="mr-2 h-5 w-5 text-accent" /> Our Mission</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to provide a seamless, fair, and incredibly fun online platform for playing Housie (also known as Tambola or Bingo) with anyone, anywhere. We believe in the power of games to bring people together, create lasting memories, and spark friendly competition. HousieHub was built to be intuitive for all ages, whether you're a seasoned player or new to the game.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold flex items-center mb-2"><Gem className="mr-2 h-5 w-5 text-accent" /> What We Offer</h3>
            <p className="text-muted-foreground leading-relaxed">
              HousieHub offers a feature-rich experience including private rooms for friends and family, public rooms to play with a global community, automated and manual number calling, fair ticket generation, and real-time prize validation. We are continuously working on new features to make your gaming experience even better.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
