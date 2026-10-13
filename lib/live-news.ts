import { NEWS_SOURCES, fetchSourceResult } from "@/lib/rssService";
import { NewsItem } from "@/types/news";

export async function fetchLiveNews(): Promise<{
  items: NewsItem[];
  results: Awaited<ReturnType<typeof fetchSourceResult>>[];
  updatedAt: string;
}> {
  const results = await Promise.all(NEWS_SOURCES.map(fetchSourceResult));
  const items = results
    .flatMap((result) => result.items)
    .sort(
      (first, second) =>
        new Date(second.pubDate).getTime() - new Date(first.pubDate).getTime()
    );

  return { items, results, updatedAt: new Date().toISOString() };
}
