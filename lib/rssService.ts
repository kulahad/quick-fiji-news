import { NewsItem } from "@/types/news";
import { XMLParser } from "fast-xml-parser";
import { decode } from "html-entities";
import { categorizeFromRssCategories, categorizeText } from "./categoryMatcher";

interface RSSItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  isoDate?: unknown;
  published?: unknown;
  updated?: unknown;
  description?: unknown;
  content?: unknown;
  "content:encoded"?: unknown;
  guid?: unknown;
  category?: unknown;
}

const FEED_CACHE_TTL = 3 * 60 * 1000;
const FEED_RETRY_DELAY = 30 * 1000;
const FEED_TIMEOUT = 6500;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const SUMMARY_LENGTH = 300;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  textNodeName: "text",
  isArray: (name) => ["item", "entry", "category"].includes(name),
});

export const RSS_SOURCES = [
  "https://www.fbcnews.com.fj/feed/",
  "https://islandsbusiness.com/feed/",
  "https://fijilive.com/feed/",
  "https://fijionenews.com.fj/feed/",
];

interface FeedCacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

const feedCache = new Map<string, FeedCacheEntry>();
const feedFailures = new Map<string, number>();
const inFlightFeeds = new Map<string, Promise<NewsItem[]>>();

function getText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getText).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getText(record["#text"] ?? record.text ?? record._);
  }

  return "";
}

function getLink(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return getLink(value[0]);

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getText(record._href ?? record.href ?? record._);
  }

  return "";
}

function summarizeItem(item: RSSItem): string {
  const rawContent = getText(
    item.description ?? item.content ?? item["content:encoded"]
  );
  const plainText = decode(rawContent)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= SUMMARY_LENGTH) return plainText;

  const excerpt = plainText.slice(0, SUMMARY_LENGTH - 3);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, lastSpace > 200 ? lastSpace : excerpt.length)}...`;
}

async function readFeedBody(
  response: Response,
  source: string
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FEED_BYTES) {
    throw new Error(`Feed response exceeded size limit: ${source}`);
  }

  if (!response.body) {
    throw new Error(`Feed response had no body: ${source}`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error(`Feed response exceeded size limit: ${source}`);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

function parseFeed(source: string, feedContent: string): NewsItem[] {
  const result = parser.parse(feedContent);
  const channel = result.rss?.channel || result.feed;
  const rawItems = channel?.item || channel?.entry || [];
  const entries: RSSItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const sourceName = new URL(source).hostname.replace(/^www\./, "");

  return entries.flatMap((item) => {
    const title = decode(getText(item.title).trim());
    const link = getLink(item.link).trim();
    const content = summarizeItem(item);
    const dateText = getText(
      item.pubDate ?? item.isoDate ?? item.published ?? item.updated
    );
    const parsedDate = dateText ? new Date(dateText) : null;

    if (!title || !link || !parsedDate || Number.isNaN(parsedDate.getTime())) {
      return [];
    }

    const categories = Array.isArray(item.category)
      ? item.category.map(getText).filter(Boolean)
      : item.category
        ? [getText(item.category)].filter(Boolean)
        : [];
    const publishedAt = parsedDate.toISOString();
    const startOfMonth = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      1
    );
    const daysFromMonthStart = Math.floor(
      (parsedDate.getTime() - startOfMonth.getTime()) / 86_400_000
    );
    const mappedCategories = categorizeFromRssCategories(categories);
    const fallbackCategories = categorizeText(title, content);

    return [
      {
        title,
        link,
        pubDate: publishedAt,
        content,
        source: sourceName,
        guid: getText(item.guid).trim() || link,
        categories: mappedCategories.length ? mappedCategories : fallbackCategories,
        volume: {
          number: `${parsedDate.getFullYear()}-${String(
            parsedDate.getMonth() + 1
          ).padStart(2, "0")}`,
          issue: `${Math.floor(daysFromMonthStart / 7) + 1}`,
        },
      },
    ];
  });
}

async function refreshFeed(source: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT);

  try {
    const response = await fetch(source, {
      headers: {
        "User-Agent": "QuickFijiNews/1.0",
        Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${source}`);
    }

    const feedContent = await readFeedBody(response, source);
    const items = parseFeed(source, feedContent);
    if (items.length === 0) {
      throw new Error(`Feed contained no valid news items: ${source}`);
    }

    feedCache.set(source, { items, fetchedAt: Date.now() });
    feedFailures.delete(source);
    return items;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchSingleFeed(source: string): Promise<NewsItem[]> {
  const now = Date.now();
  const cached = feedCache.get(source);

  if (cached && now - cached.fetchedAt < FEED_CACHE_TTL) {
    return Promise.resolve(cached.items);
  }

  const retryAfter = feedFailures.get(source) ?? 0;
  if (retryAfter > now) {
    return Promise.resolve(cached?.items ?? []);
  }

  const existingRequest = inFlightFeeds.get(source);
  if (existingRequest) return existingRequest;

  const request = refreshFeed(source)
    .catch((error: unknown) => {
      feedFailures.set(source, Date.now() + FEED_RETRY_DELAY);
      console.error(`Unable to refresh RSS feed ${source}:`, error);
      return cached?.items ?? [];
    })
    .finally(() => {
      inFlightFeeds.delete(source);
    });

  inFlightFeeds.set(source, request);
  return request;
}

export async function* fetchFeedsGenerator() {
  for (const source of RSS_SOURCES) {
    yield await fetchSingleFeed(source);
  }
}
