
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, BarChart2, Percent, Crown, TrendingUp } from "lucide-react";

// Mock data - replace with actual data fetching
const userProfile = {
  username: "HousiePro123",
  avatarUrl: "https://placehold.co/100x100.png",
  totalMatchesPlayed: 150,
  matchesWon: {
    jaldi5: 25,
    topLine: 15,
    middleLine: 12,
    bottomLine: 10,
    fullHouse1st: 8,
    fullHouse2nd: 5,
  },
  currentWinningStreak: 3,
  winRate: 45, // Percentage
};

export default function ProfilePage() {
  const totalWins = Object.values(userProfile.matchesWon).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-4 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={userProfile.avatarUrl} alt={userProfile.username} data-ai-hint="profile avatar" />
            <AvatarFallback>{userProfile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-4xl font-bold">{userProfile.username}</CardTitle>
            <CardDescription className="text-lg">Your Housie Journey and Achievements</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <StatCard icon={<BarChart2 />} title="Total Matches Played" value={userProfile.totalMatchesPlayed.toString()} />
            <StatCard icon={<Crown />} title="Total Wins" value={totalWins.toString()} />
            <StatCard icon={<Percent />} title="Win Rate" value={`${userProfile.winRate}%`} />
            <StatCard icon={<TrendingUp />} title="Current Winning Streak" value={userProfile.currentWinningStreak.toString()} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center"><Award className="mr-2 text-accent" /> Wins Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(userProfile.matchesWon).map(([prize, count]) => (
            <PrizeStatCard key={prize} prizeName={formatPrizeName(prize)} count={count} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <Card className="bg-secondary/30 p-4 rounded-lg flex items-center space-x-4">
      <div className="text-primary p-3 bg-primary/10 rounded-full">
        {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

interface PrizeStatCardProps {
  prizeName: string;
  count: number;
}
function PrizeStatCard({ prizeName, count }: PrizeStatCardProps) {
    return (
      <div className="p-4 bg-background rounded-lg border border-border flex justify-between items-center">
        <span className="font-medium text-foreground/80">{prizeName}</span>
        <span className="font-bold text-lg text-primary">{count}</span>
      </div>
    );
}

function formatPrizeName(prizeKey: string): string {
  return prizeKey
    .replace(/([A-Z0-9])/g, ' $1') // Add space before uppercase letters and numbers
    .replace('1st', '1st')
    .replace('2nd', '2nd')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

