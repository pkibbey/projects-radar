import { cn } from "@/lib/utils";

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
  
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const textSizeClass = size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";
  
  let bgColorClass = "";
  let textColorClass = "";
  
  if (color === "green") {
    bgColorClass = "bg-emerald-500 ring-emerald-500/20";
    textColorClass = "text-emerald-600 dark:text-emerald-400";
  } else if (color === "yellow") {
    bgColorClass = "bg-amber-500 ring-amber-500/20";
    textColorClass = "text-amber-600 dark:text-amber-400";
  } else if (color === "orange") {
    bgColorClass = "bg-orange-500 ring-orange-500/20";
    textColorClass = "text-orange-600 dark:text-orange-400";
  } else {
    bgColorClass = "bg-rose-500 ring-rose-500/20";
    textColorClass = "text-rose-600 dark:text-rose-400";
  }

  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={cn(
          "relative flex items-center justify-center rounded-full ring-2",
          sizeClass,
          bgColorClass
        )}
        title={`Completeness: ${score}% (${label})`}
      >
        <div 
          className="absolute inset-0 rounded-full bg-current opacity-10"
          aria-hidden="true"
        />
        <span className={cn(
          "relative z-10 font-semibold text-white",
          textSizeClass
        )}>
          {score}
        </span>
      </div>
      {showLabel && (
        <span className={cn(
          "font-medium",
          size === "sm" ? "text-xs" : "text-sm",
          textColorClass
        )}>
          {label}
        </span>
      )}
    </div>
  );
};