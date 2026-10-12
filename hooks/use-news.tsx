import { useState, useEffect, useCallback, useRef } from "react";
import { NewsItem } from "@/types/news";

interface NewsApiResponse {
  items: NewsItem[];
  stale?: boolean;
  updatedAt?: string;
}

function isNewsApiResponse(value: unknown): value is NewsApiResponse {
  if (!value || typeof value !== "object") return false;

  const items = (value as { items?: unknown }).items;
  return (
    Array.isArray(items) &&
    items.every(
      (item) =>
        item &&
        typeof item.title === "string" &&
        typeof item.source === "string" &&
        typeof item.pubDate === "string" &&
        typeof item.link === "string"
    )
  );
}

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadedSources, setLoadedSources] = useState<Set<string>>(new Set());
  const [previousLoadedSources, setPreviousLoadedSources] = useState<string[]>(
    []
  );
  const loadedSourcesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadedSourcesRef.current = loadedSources;
  }, [loadedSources]);

  const fetchNews = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/news", { signal });
        if (!response.ok) {
          throw new Error(`News service returned HTTP ${response.status}`);
        }

        const data: unknown = await response.json();
        if (!isNewsApiResponse(data)) {
          throw new Error("News service returned an invalid response");
        }

        setPreviousLoadedSources(Array.from(loadedSourcesRef.current));
        const sortedNews = [...data.items].sort(
          (first, second) =>
            new Date(second.pubDate).getTime() -
            new Date(first.pubDate).getTime()
        );
        setNews(sortedNews);
        setLoadedSources(new Set(sortedNews.map((item) => item.source)));
        setStale(data.stale ?? false);
        setLastUpdated(data.updatedAt ?? new Date().toISOString());
        setError(null);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        console.error("Unable to load news:", fetchError);
        setError(
          "News could not be refreshed. Previously loaded stories remain available."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refetch = useCallback(() => {
    setLoading(true);
    void fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    const abortController = new AbortController();
    void fetchNews(abortController.signal);
    return () => abortController.abort();
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    stale,
    lastUpdated,
    refetch,
    loadedSources: Array.from(loadedSources),
    previousLoadedSources,
  };
}
