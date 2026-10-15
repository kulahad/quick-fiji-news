import { NewsItem } from "@/types/news";
import * as cheerio from "cheerio";
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

const SOURCE_CACHE_TTL = 3 * 60 * 1000;
const SOURCE_RETRY_DELAY = 30 * 1000;
const SOURCE_TIMEOUT = 6500;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const SUMMARY_LENGTH = 300;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  textNodeName: "text",
  isArray: (name) => ["item", "entry", "category"].includes(name),
});

const RSS_SOURCES = [
  "https://www.fbcnews.com.fj/feed/",
  "https://islandsbusiness.com/feed/",
  "https://fijilive.com/feed/",
  "https://fijionenews.com.fj/feed/",
];

// HTML parsers are registered at the bottom of this module (see HTML_PARSER_REGISTRY).
// Keep this declaration minimal so adding a site does not require editing an index.

interface SourceCacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

export interface SourceFetchResult {
  items: NewsItem[];
  error: string | null;
  durationMs: number;
  lastUpdated: string | null;
  stale: boolean;
}

interface SourceFailure {
  retryAfter: number;
  error: string;
}

const sourceCache = new Map<string, SourceCacheEntry>();
const sourceFailures = new Map<string, SourceFailure>();
const inFlightSources = new Map<string, Promise<SourceFetchResult>>();

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

function parsePublishedDate(dateText: string, referenceTime: number): Date | null {
  const normalized = dateText.trim();
  if (!normalized) return null;

  const relativeDate = normalized.match(
    /^(?:about\s+)?(\d+)\s+(minute|hour|day|week)s?\s+ago$/i
  );
  if (relativeDate) {
    const units: Record<string, number> = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
    };
    return new Date(
      referenceTime -
        Number(relativeDate[1]) * units[relativeDate[2].toLowerCase()]
    );
  }
  if (/^(?:just now|today)$/i.test(normalized)) {
    return new Date(referenceTime);
  }
  if (/^yesterday$/i.test(normalized)) {
    return new Date(referenceTime - 86_400_000);
  }

  const dayFirstDate = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (dayFirstDate) {
    const month = new Date(`${dayFirstDate[2]} 1, 2000`).getMonth();
    if (month >= 0) {
      const parsed = new Date(
        Date.UTC(Number(dayFirstDate[3]), month, Number(dayFirstDate[1]))
      );
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getArticleUrl(source: string, href: string | undefined): string | null {
  if (!href) return null;

  try {
    const url = new URL(href, source);
    const sourceUrl = new URL(source);
    const excludedPath = /^\/(?:category|tag|author|authors|image-gallery|video)(?:\/|$)/i;
    if (
      url.origin !== sourceUrl.origin ||
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname === "/" ||
      excludedPath.test(url.pathname)
    ) {
      return null;
    }

    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function createScrapedItem(
  source: string,
  title: string,
  link: string,
  dateText: string,
  content: string,
  referenceTime: number
): NewsItem | null {
  const parsedDate = parsePublishedDate(dateText, referenceTime);
  if (!title || !parsedDate) return null;

  const publishedAt = parsedDate.toISOString();
  const startOfMonth = new Date(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    1
  );
  const daysFromMonthStart = Math.floor(
    (parsedDate.getTime() - startOfMonth.getTime()) / 86_400_000
  );
  const summary = summarizeItem({ description: content });
  const sourceName = new URL(source).hostname.replace(/^www\./, "");

  return {
    title,
    link,
    pubDate: publishedAt,
    content: summary,
    source: sourceName,
    guid: link,
    categories: categorizeText(title, summary),
    volume: {
      number: `${parsedDate.getUTCFullYear()}-${String(
        parsedDate.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      issue: `${Math.floor(daysFromMonthStart / 7) + 1}`,
    },
  };
}

function parseFijiSun(source: string, html: string, referenceTime: number) {
  const $ = cheerio.load(html);
  const stories = new Map<string, NewsItem>();

  $("h3").each((_, heading) => {
    const headingElement = $(heading);
    const title = normalizeText(headingElement.text());
    const titleLink = headingElement.closest("a");
    const link = getArticleUrl(source, titleLink.attr("href"));
    if (!title || !link) return;

    const card = titleLink.parent();
    const summary = normalizeText(
      card.find("p[class*='line-clamp']").first().text() ||
        card
          .find("p")
          .filter((_, paragraph) => {
            const text = normalizeText($(paragraph).text());
            return (
              text !== "|" &&
              !/^(?:about\s+)?\d+\s+(?:minute|hour|day|week)s?\s+ago$/i.test(
                text
              ) &&
              !/^(?:today|yesterday)$/i.test(text) &&
              !$(paragraph).closest('a[href*="/authors/"]').length
            );
          })
          .first()
          .text()
    );
    if (!summary) return;
    const dateElement = card.find("time").first();
    const dateText =
      dateElement.attr("datetime") ||
      normalizeText(dateElement.text()) ||
      normalizeText(
        card
          .find("p")
          .filter((_, paragraph) =>
            /^(?:about\s+)?\d+\s+(?:minute|hour|day|week)s?\s+ago$|^(?:today|yesterday)$/i.test(
              normalizeText($(paragraph).text())
            )
          )
          .first()
          .text()
      );

    const story = createScrapedItem(
      source,
      title,
      link,
      dateText,
      summary,
      referenceTime
    );
    if (story) stories.set(link, story);
  });

  return Array.from(stories.values());
}

function parseFijiOne(source: string, html: string, referenceTime: number) {
  const $ = cheerio.load(html);
  const stories = new Map<string, NewsItem>();

  $(".ten_pad").each((_, card) => {
    const cardElement = $(card);
    const storyLink = cardElement.find("a[href]").first();
    const link = getArticleUrl(source, storyLink.attr("href"));
    const title = normalizeText(storyLink.find("h6").first().text());
    const summary = normalizeText(
      storyLink.find(".top_3_headline_excerpt").first().text()
    );
    const dateText = normalizeText(
      cardElement
        .find(".top_3_headline_category_hours span")
        .last()
        .text()
    );
    if (!link || !title || !summary) return;

    const story = createScrapedItem(
      source,
      title,
      link,
      dateText,
      summary,
      referenceTime
    );
    if (story) stories.set(link, story);
  });

  return Array.from(stories.values());
}

async function fetchFijiTimesSummary(link: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);

  try {
    const response = await fetch(link, {
      headers: {
        "User-Agent": "QuickFijiNews/1.0",
        Accept: "text/html",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${link}`);
    }
    if (new URL(response.url).origin !== new URL(link).origin) {
      throw new Error(`Article redirected to a different host: ${link}`);
    }

    const html = await readSourceBody(response, link);
    const $ = cheerio.load(html);
    const summary =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";
    return summarizeItem({ description: summary });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseFijiTimes(
  source: string,
  html: string,
  referenceTime: number
) {
  const $ = cheerio.load(html);
  const candidates = new Map<
    string,
    { title: string; link: string; dateText: string; summary: string }
  >();

  $("article").each((_, article) => {
    const articleElement = $(article);
    let title = "";
    let link: string | null = null;

    articleElement.find("h1, h2, h3").each((_, heading) => {
      const headingElement = $(heading);
      const candidateLink = getArticleUrl(
        source,
        headingElement.closest("a").attr("href")
      );
      if (candidateLink) {
        title = normalizeText(headingElement.text());
        link = candidateLink;
        return false;
      }
    });
    if (!title || !link) return;

    const dateElement = articleElement.find("time").first();
    const dateText =
      dateElement.attr("datetime") || normalizeText(dateElement.text());
    if (!parsePublishedDate(dateText, referenceTime)) return;
    const summary = normalizeText(
      articleElement.find(".post-content p").first().text() ||
        articleElement.find("p").first().text()
    );
    candidates.set(link, { title, link, dateText, summary });
  });

  const selectedStories = Array.from(candidates.values())
    .sort(
      (first, second) =>
        parsePublishedDate(second.dateText, referenceTime)!.getTime() -
        parsePublishedDate(first.dateText, referenceTime)!.getTime()
    )
    .slice(0, 5);
  const results = await Promise.allSettled(
    selectedStories.map(async (candidate) => {
      const summary =
        candidate.summary || (await fetchFijiTimesSummary(candidate.link));
      if (!summary) return null;
      return createScrapedItem(
        source,
        candidate.title,
        candidate.link,
        candidate.dateText,
        summary,
        referenceTime
      );
    })
  );

  return results.flatMap((result) => {
    if (result.status === "rejected") {
      console.error("Unable to fetch a Fiji Times story summary:", result.reason);
      return [];
    }
    return result.value ? [result.value] : [];
  });
}

async function parseFijiVillage(source: string, html: string, referenceTime: number) {
  const $ = cheerio.load(html);
  const stories = new Map<string, NewsItem>();

  $(".fv-link-title").each((_, linkElement) => {
    const headingLink = $(linkElement);
    const link = getArticleUrl(source, headingLink.attr("href"));
    if (!link) return;

    const title = normalizeText(headingLink.text());
    const container = headingLink.closest("article").length
      ? headingLink.closest("article")
      : headingLink.closest(".card-body");
    const intro =
      normalizeText(container.find("p.fv-hero-intro, p.fv-card-intro, p.fv-list-intro, p.fv-sport-compact-intro").first().text()) ||
      normalizeText(
        container
          .find("p")
          .filter((_, paragraph) => {
            const text = normalizeText($(paragraph).text());
            return (
              text.length > 18 &&
              !/^(?:about\s+)?\d+\s+(?:minute|hour|day|week)s?\s+ago$/i.test(text) &&
              !/^\d+\s+(?:hours?|minutes?)\s+ago$/i.test(text)
            );
          })
          .first()
          .text()
      );
    const metaDate = normalizeText(
      container
        .find(
          ".fv-meta, .fv-sport-compact-meta, .fv-meta small, .fv-sport-compact-meta small"
        )
        .first()
        .text()
    );
    const meta =
      metaDate ||
      normalizeText(container.text().match(/(?:about\s+)?\d+\s+(?:minute|hour|day|week)s?\s+ago|(?:just now|today|yesterday)/i)?.[0] ?? "");
    const summary = intro;
    const story = createScrapedItem(source, title, link, meta, summary, referenceTime);
    if (story) stories.set(link, story);
  });

  return Array.from(stories.values());
}

async function parseScrapedPage(
  source: string,
  html: string
): Promise<NewsItem[]> {
  const referenceTime = Date.now();
  const scraper = HTML_PARSER_REGISTRY?.[source];
  if (!scraper) {
    throw new Error(`No HTML scraper configured for ${source}`);
  }
  return scraper(source, html, referenceTime);
}

const HTML_PARSER_REGISTRY: Record<
  string,
  (source: string, html: string, referenceTime: number) =>
    | NewsItem[]
    | Promise<NewsItem[]>
> = {
  "https://fijisun.com.fj/": parseFijiSun,
  "https://www.fijitimes.com.fj/": parseFijiTimes,
  "https://www.fijivillage.com/": parseFijiVillage,
};

export const HTML_SOURCES = Object.keys(HTML_PARSER_REGISTRY);
export const NEWS_SOURCES = [...RSS_SOURCES, ...HTML_SOURCES];

async function readSourceBody(
  response: Response,
  source: string
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new Error(`Source response exceeded size limit: ${source}`);
  }

  if (!response.body) {
    throw new Error(`Source response had no body: ${source}`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_SOURCE_BYTES) {
        await reader.cancel();
        throw new Error(`Source response exceeded size limit: ${source}`);
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
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);

  try {
    const response = await fetch(source, {
      headers: {
        "User-Agent": "QuickFijiNews/1.0",
        Accept: HTML_SOURCES.includes(source)
          ? "text/html,application/xhtml+xml"
          : "application/atom+xml, application/rss+xml, application/xml, text/xml, text/html",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${source}`);
    }

    const feedContent = await readSourceBody(response, source);
    const items =
      HTML_PARSER_REGISTRY && Object.hasOwn(HTML_PARSER_REGISTRY, source)
        ? await parseScrapedPage(source, feedContent)
        : parseFeed(source, feedContent);
    if (items.length === 0) {
      throw new Error(`Source contained no valid news items: ${source}`);
    }

    sourceCache.set(source, { items, fetchedAt: Date.now() });
    sourceFailures.delete(source);
    return items;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchSourceResult(
  source: string
): Promise<SourceFetchResult> {
  const now = Date.now();
  const cached = sourceCache.get(source);

  if (cached && now - cached.fetchedAt < SOURCE_CACHE_TTL) {
    return Promise.resolve({
      items: cached.items,
      error: null,
      durationMs: 0,
      lastUpdated: new Date(cached.fetchedAt).toISOString(),
      stale: false,
    });
  }

  const failure = sourceFailures.get(source);
  if (failure && failure.retryAfter > now) {
    return Promise.resolve({
      items: cached?.items ?? [],
      error: failure.error,
      durationMs: 0,
      lastUpdated: cached ? new Date(cached.fetchedAt).toISOString() : null,
      stale: true,
    });
  }

  const existingRequest = inFlightSources.get(source);
  if (existingRequest) return existingRequest;

  const startedAt = Date.now();
  const request = refreshFeed(source)
    .then((items) => {
      const updatedAt = sourceCache.get(source)?.fetchedAt ?? Date.now();
      return {
        items,
        error: null,
        durationMs: Date.now() - startedAt,
        lastUpdated: new Date(updatedAt).toISOString(),
        stale: false,
      };
    })
    .catch((error: unknown): SourceFetchResult => {
      const timedOut = error instanceof Error && error.name === "AbortError";
      const message = timedOut
        ? `Source request timed out after ${SOURCE_TIMEOUT}ms`
        : error instanceof Error
          ? error.message
          : "Unknown source error";
      sourceFailures.set(source, {
        retryAfter: Date.now() + SOURCE_RETRY_DELAY,
        error: message,
      });
      if (timedOut) {
        console.warn(`News source timed out after ${SOURCE_TIMEOUT}ms: ${source}`);
      } else {
        console.error(`Unable to refresh news source ${source}:`, error);
      }
      return {
        items: cached?.items ?? [],
        error: message,
        durationMs: Date.now() - startedAt,
        lastUpdated: cached ? new Date(cached.fetchedAt).toISOString() : null,
        stale: true,
      };
    })
    .finally(() => {
      inFlightSources.delete(source);
    });

  inFlightSources.set(source, request);
  return request;
}

export async function fetchSingleSource(source: string): Promise<NewsItem[]> {
  return (await fetchSourceResult(source)).items;
}

export async function* fetchNewsSourcesGenerator() {
  for (const source of NEWS_SOURCES) {
    yield await fetchSingleSource(source);
  }
}
