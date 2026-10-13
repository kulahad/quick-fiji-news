import Link from "next/link";
import { ExternalLink } from "lucide-react";

type SiteAttributionProps = {
  className?: string;
};

export function SiteAttribution({ className = "" }: SiteAttributionProps) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`.trim()}>
      <Link
        href="https://kulahad.github.io/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        Built by Mohammed Ahad <ExternalLink className="h-3 w-3" />
      </Link>
      <span className="text-[11px] text-muted-foreground/60">
        Created with ❤️ in Fiji
      </span>
    </div>
  );
}
