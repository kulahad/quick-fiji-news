import { fetchLiveNews } from "@/lib/live-news";
import type { LiveNewsSourceStatus } from "@/lib/live-news";
import type { NewsItem } from "@/types/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (!cancelled) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      };

      send({ type: "start" });
      const sourceStatuses: LiveNewsSourceStatus[] = [];
      const sourceItems = new Map<string, NewsItem[]>();

      try {
        const { partial, updatedAt } = await fetchLiveNews(
          (source, result) => {
            if (cancelled) return;

            const sourceName = new URL(source).hostname.replace(/^www\./, "");
            const status = {
              source: sourceName,
              error: result.error,
              lastUpdated: result.lastUpdated,
              stale: result.stale,
            };
            sourceStatuses.push(status);

            if (result.items.length > 0) {
              sourceItems.set(sourceName, result.items);
              send({
                type: "chunk",
                source: sourceName,
                items: result.items,
                lastUpdated: result.lastUpdated,
                stale: result.stale,
              });
            }

            if (result.error) {
              send({
                type: "source",
                ...status,
                error: "A news source is temporarily unavailable.",
              });
            }
          }
        );
        const items = Array.from(sourceItems.values()).flat();
        const failedSources = sourceStatuses
          .filter((status) => status.error)
          .map((status) => status.source);

        send({
          type: "end",
          items,
          sources: sourceStatuses,
          partial,
          failedSources,
          updatedAt,
        });
      } catch (error) {
        console.error("Unable to stream news:", error);
        send({
          type: "error",
          error: "News is temporarily unavailable.",
        });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
