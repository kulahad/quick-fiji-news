import { useState, useEffect, useCallback, useRef } from "react";
import { NewsItem } from "@/types/news";

interface NewsSourceStatus {
  source: string;
  error: string | null;
  lastUpdated: string | null;
  stale: boolean;
}

interface NewsApiResponse {
  items: NewsItem[];
  updatedAt?: string;
  partial?: boolean;
  failedSources?: string[];
  sources?: NewsSourceStatus[];
}

interface CachedNews extends NewsApiResponse {
  updatedAt: string;
}

const NEWS_CACHE_KEY = "quick-fiji-news:cached-headlines";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isNewsItems(value: unknown): value is NewsItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.title === "string" &&
        typeof item.source === "string" &&
        typeof item.pubDate === "string" &&
        typeof item.link === "string"
    )
  );
}

function isNewsSourceStatus(value: unknown): value is NewsSourceStatus {
  return (
    isRecord(value) &&
    typeof value.source === "string" &&
    (typeof value.error === "string" || value.error === null) &&
    (typeof value.lastUpdated === "string" || value.lastUpdated === null) &&
    typeof value.stale === "boolean"
  );
}

function isNewsApiResponse(value: unknown): value is NewsApiResponse {
  if (!isRecord(value) || !isNewsItems(value.items)) return false;
  if (value.updatedAt !== undefined && typeof value.updatedAt !== "string") {
    return false;
  }
  if (value.partial !== undefined && typeof value.partial !== "boolean") {
    return false;
  }
  if (
    value.failedSources !== undefined &&
    (!Array.isArray(value.failedSources) ||
      !value.failedSources.every((source) => typeof source === "string"))
  ) {
    return false;
  }
  return (
    value.sources === undefined ||
    (Array.isArray(value.sources) && value.sources.every(isNewsSourceStatus))
  );
}

function readCachedNews(): CachedNews | null {
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (!cached) return null;

    const data: unknown = JSON.parse(cached);
    if (isNewsApiResponse(data) && typeof data.updatedAt === "string") {
      return { ...data, updatedAt: data.updatedAt };
    }

    console.error("Saved headlines have an invalid format");
  } catch (cacheError) {
    console.error("Unable to read saved headlines:", cacheError);
  }

  return null;
}

function saveCachedNews(data: CachedNews) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(data));
  } catch (cacheError) {
    console.error("Unable to save headlines for offline use:", cacheError);
  }
}

function sortNews(items: NewsItem[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.pubDate).getTime() - new Date(first.pubDate).getTime()
  );
}

function mergeSourceStatus(
  statuses: Map<string, NewsSourceStatus>,
  status: NewsSourceStatus
) {
  statuses.set(status.source, status);
  return Array.from(statuses.values());
}

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [partial, setPartial] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadedSources, setLoadedSources] = useState<Set<string>>(new Set());
  const [previousLoadedSources, setPreviousLoadedSources] = useState<string[]>(
    []
  );
  const [sourceStatuses, setSourceStatuses] = useState<NewsSourceStatus[]>([]);
  const loadedSourcesRef = useRef<Set<string>>(new Set());
  const hasFreshResponseRef = useRef(false);

  useEffect(() => {
    loadedSourcesRef.current = loadedSources;
  }, [loadedSources]);

  const fetchNews = useCallback(async (signal?: AbortSignal) => {
    const sourceItems = new Map<string, NewsItem[]>();
    const statuses = new Map<string, NewsSourceStatus>();
    let lineBuffer = "";
    let ended = false;

    const applyEvent = (value: unknown) => {
      if (!isRecord(value) || typeof value.type !== "string") {
        throw new Error("News stream returned an invalid event");
      }

      if (value.type === "chunk") {
        if (
          typeof value.source !== "string" ||
          !isNewsItems(value.items) ||
          (value.lastUpdated !== null &&
            value.lastUpdated !== undefined &&
            typeof value.lastUpdated !== "string") ||
          (value.stale !== undefined && typeof value.stale !== "boolean")
        ) {
          throw new Error("News stream returned an invalid source update");
        }

        hasFreshResponseRef.current = true;
        sourceItems.set(value.source, value.items);
        setNews(sortNews(Array.from(sourceItems.values()).flat()));
        setLoadedSources(new Set(sourceItems.keys()));
        const status: NewsSourceStatus = {
          source: value.source,
          error: null,
          lastUpdated:
            typeof value.lastUpdated === "string" ? value.lastUpdated : null,
          stale: value.stale === true,
        };
        setSourceStatuses(mergeSourceStatus(statuses, status));
        return;
      }

      if (value.type === "source") {
        if (!isNewsSourceStatus(value)) {
          throw new Error("News stream returned an invalid source status");
        }
        hasFreshResponseRef.current = true;
        setSourceStatuses(mergeSourceStatus(statuses, value));
        setFailedSources(
          Array.from(statuses.values())
            .filter((status) => status.error !== null)
            .map((status) => status.source)
        );
        setPartial(true);
        return;
      }

      if (value.type === "end") {
        if (
          !isNewsItems(value.items) ||
          typeof value.updatedAt !== "string" ||
          typeof value.partial !== "boolean" ||
          !Array.isArray(value.sources) ||
          !value.sources.every(isNewsSourceStatus) ||
          !Array.isArray(value.failedSources) ||
          !value.failedSources.every((source) => typeof source === "string")
        ) {
          throw new Error("News stream returned an invalid completion event");
        }

        const sortedNews = sortNews(value.items);
        const finalStatuses = value.sources;
        const updatedAt = value.updatedAt;
        hasFreshResponseRef.current = true;
        setPreviousLoadedSources(Array.from(loadedSourcesRef.current));
        setNews(sortedNews);
        setLoadedSources(new Set(sortedNews.map((item) => item.source)));
        setSourceStatuses(finalStatuses);
        setPartial(value.partial);
        setStale(value.partial || finalStatuses.some((status) => status.stale));
        setFailedSources(value.failedSources);
        setLastUpdated(updatedAt);
        setError(null);
        saveCachedNews({
          items: sortedNews,
          updatedAt,
          partial: value.partial,
          failedSources: value.failedSources,
          sources: finalStatuses,
        });
        ended = true;
        return;
      }

      if (value.type === "error") {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "News is temporarily unavailable."
        );
      }

      if (value.type !== "start") {
        throw new Error("News stream returned an unknown event");
      }
    };

    try {
      const response = await fetch("/api/news-stream", { signal });
      if (!response.ok) {
        throw new Error(`News service returned HTTP ${response.status}`);
      }
      if (!response.body) {
        throw new Error("News service returned an empty response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        lineBuffer += decoder.decode(value, { stream: !done });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) applyEvent(JSON.parse(line) as unknown);
        }
        if (done) break;
      }
      if (lineBuffer.trim()) applyEvent(JSON.parse(lineBuffer) as unknown);
      if (!ended) throw new Error("News stream ended before completion");
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return;
      }

      console.error("Unable to load news:", fetchError);
      const cached = readCachedNews();
      if (cached) {
        const sortedNews = sortNews(cached.items);
        setPreviousLoadedSources(Array.from(loadedSourcesRef.current));
        setNews(sortedNews);
        setLoadedSources(new Set(sortedNews.map((item) => item.source)));
        setSourceStatuses(cached.sources ?? []);
        setPartial(cached.partial ?? false);
        setFailedSources(cached.failedSources ?? []);
        setStale(true);
        setLastUpdated(cached.updatedAt);
        setError(null);
      } else {
        setStale(true);
        setError(
          "News could not be refreshed. Previously loaded stories remain available."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    void fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    const cacheTimeout = window.setTimeout(() => {
      if (hasFreshResponseRef.current) return;

      const cached = readCachedNews();
      if (!cached) return;

      const cachedItems = sortNews(cached.items);
      setNews(cachedItems);
      setLoadedSources(new Set(cachedItems.map((item) => item.source)));
      setSourceStatuses(cached.sources ?? []);
      setPartial(cached.partial ?? false);
      setFailedSources(cached.failedSources ?? []);
      setStale(true);
      setLastUpdated(cached.updatedAt);
    }, 0);

    const abortController = new AbortController();
    void fetchNews(abortController.signal);
    return () => {
      window.clearTimeout(cacheTimeout);
      abortController.abort();
    };
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    stale,
    partial,
    failedSources,
    sourceStatuses,
    lastUpdated,
    refetch,
    loadedSources: Array.from(loadedSources),
    previousLoadedSources,
  };
}
