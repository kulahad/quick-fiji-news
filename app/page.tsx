"use client";

import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import NewsContainer from "@/components/news-container";
import { SiteAttribution } from "@/components/site-attribution";
import { calculateVolumeInfo } from "@/lib/textUtils";

export const dynamic = "force-dynamic";

export default function Home() {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      setToday(new Date());
      intervalId = setInterval(() => setToday(new Date()), 60000);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Get current date in newspaper format
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = today?.toLocaleDateString("en-FJ", {
    ...options,
    timeZone: "Pacific/Fiji",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black dark:border-gray-800">
        <div className="container px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 flex items-center justify-center gap-2 sm:gap-5">
            <h1 className="font-heading text-center text-3xl leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span aria-hidden="true" className="mr-2 sm:mr-3">
                🇫🇯
              </span>
              Quick Fiji News
            </h1>
            <ThemeToggle />
          </div>
          <div className="mb-4 text-center">
            <div className="mt-1 text-xs uppercase tracking-widest">
              {formattedDate ?? "\u00a0"}
            </div>
          </div>{" "}
          <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1 border-y border-black py-2 text-xs dark:border-gray-800 sm:grid-cols-3 sm:text-sm">
            <div className="tabular-nums">
              {today
                ? `Vol. ${calculateVolumeInfo(today).volume} No. ${
                    calculateVolumeInfo(today).issueNumber
                  }`
                : "\u00a0"}
            </div>
            <div className="col-span-2 order-last text-center sm:col-span-1 sm:order-none">
              Fiji&apos;s Premier News Aggregator
            </div>
            <div className="text-right">Daily Edition</div>
          </div>
        </div>
      </header>
      <main className="container px-4 md:px-6 lg:px-8 py-8">
        <section aria-labelledby="latest-news-heading">
          <div className="mb-8 flex items-center justify-between gap-3 border-b-2 border-black pb-2 dark:border-gray-800">
            <h2 id="latest-news-heading" className="font-heading text-3xl">
              Latest News
            </h2>
            <InstallPrompt />
          </div>
          <Suspense fallback={<NewsFeedSkeleton />}>
            <NewsContainer />
          </Suspense>
        </section>
      </main>
      <footer className="border-t border-black dark:border-gray-800 py-6 mt-8">
        <div className="container px-4 md:px-6 lg:px-8 text-center text-sm">
          <p>
            © {today?.getFullYear() ?? ""} Quick Fiji News. All rights reserved.
          </p>
          <div className="mt-2">
            <SiteAttribution className="items-center"/>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NewsFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array(5)
        .fill(null)
        .map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="flex items-start space-x-4">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
