

"use client";

import { cn } from "@/lib/utils";
import { Shield, Award, Badge as BadgeIcon, Medal, Trophy, Star } from "lucide-react";

export const BadgeIconComponent = ({ iconName, badgeName, hasBadge, ...props }: { iconName: string, badgeName: string, hasBadge: boolean } & Omit<React.ComponentProps<typeof Shield>, 'color' | 'fill'>) => {
    const badgeColors: Record<string, string> = {
        "Bronze Competitor": "text-yellow-600 dark:text-yellow-500 fill-yellow-600/30 dark:fill-yellow-500/30",
        "Silver Veteran": "text-slate-500 dark:text-slate-400 fill-slate-500/30 dark:fill-slate-400/30",
        "Gold Master": "text-amber-500 dark:text-amber-400 fill-amber-500/30 dark:fill-amber-400/30",
        "Platinum Player": "text-blue-500 dark:text-blue-400 fill-blue-500/30 dark:fill-blue-400/30",
    };

    const unlockedColorClass = hasBadge
        ? badgeColors[badgeName] || "text-green-500 fill-green-500/20"
        : "text-muted-foreground";

    const finalClassName = cn(props.className, unlockedColorClass);

    const renderIcon = () => {
        const iconProps = { ...props, className: finalClassName };
        switch (iconName) {
            case 'Shield': return <Shield {...iconProps} />;
            case 'Award': return <Award {...iconProps} />;
            case 'Badge': return <BadgeIcon {...iconProps} />;
            case 'Medal': return <Medal {...iconProps} />;
            case 'Trophy': return <Trophy {...iconProps} />;
            default: return <Star {...iconProps} />;
        }
    };
    return renderIcon();
};
