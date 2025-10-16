import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CompletenessIndicatorProps = {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  if (score >= 40) return "orange";
  return "red";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
};

export const CompletenessIndicator = ({ 
  score, 
  size = "md", 
  showLabel = false 
}: CompletenessIndicatorProps) => {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  
  const textSizeClass = size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";
  
  let badgeColorClass = "";
  let labelColorClass = "";
  
  if (color === "green") {
    badgeColorClass = "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    labelColorClass = "text-emerald-600 dark:text-emerald-400";
  } else if (color === "yellow") {
    badgeColorClass = "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
    labelColorClass = "text-amber-600 dark:text-amber-400";
  } else if (color === "orange") {
    badgeColorClass = "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
    labelColorClass = "text-orange-600 dark:text-orange-400";
  } else {
    badgeColorClass = "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800";
    labelColorClass = "text-rose-600 dark:text-rose-400";
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge 
        variant="outline"
        className={cn(
          "font-semibold",
          textSizeClass,
          badgeColorClass
        )}
        title={`Completeness: ${score}% (${label})`}
      >
        {score}%
      </Badge>
      {showLabel && (
        <span className={cn(
          "font-medium",
          size === "sm" ? "text-xs" : "text-sm",
          labelColorClass
        )}>
          {label}
        </span>
      )}
    </div>
  );
};