import { NextResponse } from "next/server";
import { fetchLiveNews } from "@/lib/live-news";
import { NEWS_SOURCES } from "@/lib/rssService";
import type { NewsItem } from "@/types/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(
  items: NewsItem[],
  updatedAt: string,
  sources: Awaited<ReturnType<typeof fetchLiveNews>>["sources"],
  partial: boolean
) {
  return NextResponse.json(
    {
      items,
      sourcesCount: NEWS_SOURCES.length,
      totalItems: items.length,
      stale: partial,
      partial,
      sources,
      updatedAt,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=1800, stale-while-revalidate=300",
      },
    }
  );
}

export async function GET() {
  try {
    const { items, updatedAt, sources, partial } = await fetchLiveNews();
    if (items.length > 0) return response(items, updatedAt, sources, partial);

    return NextResponse.json(
      { error: "News sources are temporarily unavailable.", items: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unable to fetch news:", error);
    return NextResponse.json(
      { error: "News is temporarily unavailable.", items: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
