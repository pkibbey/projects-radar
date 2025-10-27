import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OwnershipBadgeProps = {
  isFork: boolean;
  isOwnedByUser: boolean;
  ownerUsername?: string;
};

export const OwnershipBadge = ({ isFork, isOwnedByUser, ownerUsername }: OwnershipBadgeProps) => {
  if (isFork) {
    return (
      <Badge variant="outline" className={cn("gap-1", "bg-purple-500/10 text-purple-600 ring-purple-500/30 dark:text-purple-400")}>
        <span>🍴</span>
        Fork
      </Badge>
    );
  }

  if (isOwnedByUser) {
    return (
      <Badge variant="outline" className={cn("gap-1", "bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400")}>
        <span>👤</span>
        Your repo
      </Badge>
    );
  }

  // Contributed to but not owned
  if (ownerUsername) {
    return (
      <Badge variant="outline" className={cn("gap-1", "bg-green-500/10 text-green-600 ring-green-500/30 dark:text-green-400")}>
        <span>🤝</span>
        Contributed to
      </Badge>
    );
  }

  return null;
};
