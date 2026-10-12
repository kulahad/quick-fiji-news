import { useEffect, useRef } from "react";
import { Clock, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { SOURCES } from "./news-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNews } from "../hooks/use-news";
import { stripHtml, truncateText, formatVolumeInfo } from "../lib/textUtils";
import { NewsCategory, NewsItem } from "@/types/news";
import { Toaster, toast } from "sonner";
import { formatDate } from "../lib/dateUtils";
import Link from "next/link";

// Helper function to normalize domain
function normalizeDomain(domain: string): string {
  return domain.replace(/^(www\.)?/, "").toLowerCase();
}

// Helper function to format source names
function formatSource(source: string): string {
  const domain = source.replace(/^https?:\/\/(?:www\.)?([^/]+).*$/, "$1");
  const normalizedDomain = normalizeDomain(domain);
  const sourceInfo = SOURCES.find(
    (s) => normalizeDomain(s.value) === normalizedDomain
  );
  return sourceInfo ? sourceInfo.label : domain;
}

// Helper function to get badge style based on category
function getBadgeStyle(category: string): string {
  switch (category) {
    case "Local":
      return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30";
    case "Technology":
      return "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 dark:hover:bg-purple-500/30";
    case "Business":
      return "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/20 dark:hover:bg-green-500/30";
    case "Health":
      return "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/20 dark:hover:bg-red-500/30";
    case "World":
      return "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/30";
    case "Sports":
      return "bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 dark:hover:bg-orange-500/30";
    default:
      return "bg-gray-500/10 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-gray-500/30";
  }
}

type SortOption = "latest" | "local-first";

interface NewsFeedProps {
  sources: string[];
  categories: NewsCategory[];
  searchQuery: string;
  sortOption?: SortOption;
}

export default function NewsFeed({
  sources,
  categories,
  searchQuery,
  sortOption = "latest",
}: NewsFeedProps) {
  const {
    news,
    loading,
    error,
    stale,
    lastUpdated,
    refetch,
    loadedSources,
    previousLoadedSources,
  } = useNews();
  const toastShownRef = useRef<boolean>(false);

  // Periodically refetch to get any retry results
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 300000); // Check every 5 mins for new content

    return () => clearInterval(interval);
  }, [refetch]);

  // Show error via toast once
  useEffect(() => {
    if (error && !toastShownRef.current) {
      toast.error("Unable to load the latest news", {
        description:
          "Please try refreshing the page or check your internet connection.",
      });
      toastShownRef.current = true;
    } else if (!error) {
      toastShownRef.current = false;
    }
  }, [error]);
  // Show source loading status
  useEffect(() => {
    const newlyLoadedSources = loadedSources.filter(
      (source) =>
        !previousLoadedSources.includes(source) && sources.includes(source)
    );

    if (newlyLoadedSources.length > 0) {
      // Only show toast if all sources are loaded
      if (loadedSources.length === sources.length) {
        toast.success(`Updated news feed`, {
          duration: 2000,
          position: "bottom-right",
          className: "bg-muted/80",
        });
      }
    }
  }, [loadedSources, previousLoadedSources, sources]);

  const filteredAndSortedNews = news
    .filter((item) => {
      // Source filtering with normalized domains
      const matchesSource =
        sources.length === 0 || sources.includes(normalizeDomain(item.source));

      // Category filtering
      const matchesCategory =
        categories.length === 0 ||
        (item.categories &&
          item.categories.some((cat) =>
            categories.includes(cat as NewsCategory)
          ));

      // Search filtering
      const matchesSearch = !searchQuery
        ? true
        : (item.title?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          ) ||
          (item.content?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          );
      return matchesSource && matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Get the full date objects for precise sorting
      const dateA = new Date(a.pubDate);
      const dateB = new Date(b.pubDate);

      if (sortOption === "local-first") {
        // First check if either item has Local category
        const aIsLocal = a.categories?.includes("Local") || false;
        const bIsLocal = b.categories?.includes("Local") || false;

        if (aIsLocal !== bIsLocal) {
          // If one is local and the other isn't, local comes first
          return aIsLocal ? -1 : 1;
        }
      } // Default to sorting by date with precise time
      return dateB.getTime() - dateA.getTime();
    })
    // Ensure unique keys by adding index
    .map((item, index) => ({
      ...item,
      uniqueId: `${item.guid}-${item.source}-${index}`.replace(/\s+/g, "-"),
    }));

  return (
    <div className="space-y-8">
      <Toaster />{" "}
      {loading && news.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading news...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            {!loading && news.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {stale ? "Showing saved headlines" : "Last updated"}{" "}
                  {lastUpdated ? formatDate(lastUpdated) : ""}
                </span>
              </div>
            )}
            {loading && news.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/50 ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Refreshing...</span>
              </div>
            )}
          </div>
          {filteredAndSortedNews.length === 0 && (
            <div className="text-center text-muted-foreground">
              No news found for the selected filters.
            </div>
          )}
          {filteredAndSortedNews.map((item) => (
            <article
              key={item.uniqueId}
              className="group flex flex-col space-y-4 p-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200 hover:shadow-sm"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block transition-colors duration-200 group-hover:text-primary"
                  >
                    {item.title}
                  </a>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    <time className="tabular-nums">
                      {formatDate(item.pubDate)}
                    </time>
                  </div>

                  <Separator orientation="vertical" className="h-4" />

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium bg-muted/50 px-2 py-1 rounded-md">
                        {formatSource(item.source)}
                      </span>
                    </div>
                  </div>

                  {item.categories?.length > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-4" />{" "}
                      <div className="flex flex-wrap gap-1.5">
                        {(item.categories || []).map((category, index) => {
                          const key =
                            `${item.uniqueId}-${category}-${index}`.replace(
                              /\s+/g,
                              "-"
                            );
                          return (
                            <Badge
                              key={key}
                              variant="outline"
                              className={`text-[11px] px-2.5 py-0.5 font-medium tracking-wide transition-colors duration-200 ${getBadgeStyle(
                                category
                              )}`}
                            >
                              {category}
                            </Badge>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-muted-foreground/90 leading-relaxed">
                {truncateText(stripHtml(item.content || ""), 300)}
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200"
                  asChild
                >
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    Read more <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </a>
                </Button>
              </div>
            </article>
          ))}{" "}
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
