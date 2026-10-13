import { fetchLiveNews } from "@/lib/live-news";
import { NEWS_SOURCES } from "@/lib/rssService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "start" }) + "\n")
        );

        const { results } = await fetchLiveNews();
        for (const [index, result] of results.entries()) {
          if (cancelled) return;

          const source = new URL(NEWS_SOURCES[index])
            .hostname.replace(/^www\./, "");
          if (result.items.length > 0) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  source,
                  items: result.items,
                }) + "\n"
              )
            );
          }
          if (result.error) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  source,
                  error: "A news source is temporarily unavailable.",
                }) + "\n"
              )
            );
          }
        }
      } catch (error) {
        console.error("Unable to stream news:", error);
        if (!cancelled) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: "News is temporarily unavailable.",
              }) + "\n"
            )
          );
        }
      } finally {
        if (!cancelled) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "end" }) + "\n")
          );
          controller.close();
        }
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
