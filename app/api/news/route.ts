import { NextResponse } from "next/server";
import { fetchSingleSource, NEWS_SOURCES } from "@/lib/rssService";
import { NewsItem } from "@/types/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_DURATION = 5 * 60 * 1000;

let cachedNews: NewsItem[] = [];
let cacheTimestamp = 0;
let refreshInFlight: Promise<NewsItem[]> | null = null;

async function refreshNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchSingleSource(source))
  );

  return results
    .flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    )
    .sort(
      (first, second) =>
        new Date(second.pubDate).getTime() - new Date(first.pubDate).getTime()
    );
}

function refreshCachedNews(): Promise<NewsItem[]> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = refreshNews()
    .then((items) => {
      if (items.length > 0) {
        cachedNews = items;
        cacheTimestamp = Date.now();
      }
      return items;
    })
    .catch((error: unknown) => {
      console.error("Unable to refresh the news cache:", error);
      return [];
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function response(items: NewsItem[], stale: boolean) {
  return NextResponse.json(
    {
      items,
      sourcesCount: NEWS_SOURCES.length,
      totalItems: items.length,
      stale,
      updatedAt: new Date(cacheTimestamp).toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}

export async function GET() {
  if (cachedNews.length > 0) {
    const stale = Date.now() - cacheTimestamp >= CACHE_DURATION;
    if (stale) void refreshCachedNews();
    return response(cachedNews, stale);
  }

  const refreshedNews = await refreshCachedNews();
  if (refreshedNews.length > 0) return response(refreshedNews, false);

  return NextResponse.json(
    { error: "News sources are temporarily unavailable.", items: [] },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
