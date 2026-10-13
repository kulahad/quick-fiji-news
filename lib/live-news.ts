import {
  NEWS_SOURCES,
  fetchSourceResult,
  type SourceFetchResult,
} from "@/lib/rssService";
import { NewsItem } from "@/types/news";

type SourceResultHandler = (
  source: string,
  result: SourceFetchResult
) => void;

export interface LiveNewsSourceStatus {
  source: string;
  error: string | null;
  lastUpdated: string | null;
  stale: boolean;
}

function getSourceName(source: string): string {
  return new URL(source).hostname.replace(/^www\./, "");
}

export async function fetchLiveNews(
  onSourceResult?: SourceResultHandler
): Promise<{
  items: NewsItem[];
  results: Awaited<ReturnType<typeof fetchSourceResult>>[];
  sources: LiveNewsSourceStatus[];
  partial: boolean;
  updatedAt: string;
}> {
  const results = await Promise.all(
    NEWS_SOURCES.map((source) =>
      fetchSourceResult(source).then((result) => {
        onSourceResult?.(source, result);
        return result;
      })
    )
  );
  const items = results
    .flatMap((result) => result.items)
    .sort(
      (first, second) =>
        new Date(second.pubDate).getTime() - new Date(first.pubDate).getTime()
    );

  const sources = results.map((result, index) => ({
    source: getSourceName(NEWS_SOURCES[index]),
    error: result.error,
    lastUpdated: result.lastUpdated,
    stale: result.stale,
  }));
  const successfulUpdates = sources
    .map((source) => source.lastUpdated)
    .filter((timestamp): timestamp is string => timestamp !== null)
    .sort();

  return {
    items,
    results,
    sources,
    partial: sources.some((source) => source.error !== null),
    updatedAt: successfulUpdates[0] ?? new Date().toISOString(),
  };
}
