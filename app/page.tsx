"use client";

import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import NewsContainer from "@/components/news-container";
import { calculateVolumeInfo } from "@/lib/textUtils";

export const dynamic = "force-dynamic";

export default function Home() {
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setToday(new Date());
    }, 1000); // Update every second

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);

  // Get current date in newspaper format
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = today.toLocaleDateString("en-FJ", options);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black dark:border-gray-800">
        <div className="container px-4 md:px-6 lg:px-8 py-6">
          <div className="flex justify-center align-middle items-center mb-2 mx-autoS">
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl tracking-tighter mr-5">
              Quick Fiji News
            </h1>
            <span>
              <ThemeToggle />
            </span>
          </div>
          <div className="text-center mb-4">
            <div className="text-xs uppercase tracking-widest mt-1">
              {formattedDate}
            </div>
          </div>{" "}
          <div className="flex justify-between items-center text-sm border-t border-b border-black dark:border-gray-800 py-2">
            <div>{`Vol. ${calculateVolumeInfo(today).volume} No. ${
              calculateVolumeInfo(today).issueNumber
            }`}</div>
            <div>Fiji&apos;s Premier News Aggregator</div>
            <div>Daily Edition</div>
          </div>
        </div>
      </header>
      <main className="container px-4 md:px-6 lg:px-8 py-8">
        <div className="border-b-2 border-black dark:border-gray-800 pb-2 mb-8">
          <h2 className="font-heading text-3xl">Latest News</h2>
        </div>
        <Suspense fallback={<NewsFeedSkeleton />}>
          <NewsContainer />
        </Suspense>
      </main>
      <footer className="border-t border-black dark:border-gray-800 py-6 mt-8">
        <div className="container px-4 md:px-6 lg:px-8 text-center text-sm">
          <p>© {today.getFullYear()} Quick Fiji News. All rights reserved.</p>
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
