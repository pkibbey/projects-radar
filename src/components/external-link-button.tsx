import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

type ExternalLinkButtonProps = {
  htmlUrl: string;
};

export const ExternalLinkButton = ({ htmlUrl }: ExternalLinkButtonProps) => {

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Open repository on GitHub"
      className="h-7 w-7 rounded-full bg-slate-100/80 text-slate-500 hover:bg-green-200 hover:text-green-700 dark:bg-slate-800/80 dark:hover:bg-green-700 dark:hover:text-green-200 cursor-pointer border"
      asChild      
    >
      <Link href={htmlUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" />
      </Link>
    </Button>
  );
};
