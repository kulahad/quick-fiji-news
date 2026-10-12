import { fetchSingleFeed, RSS_SOURCES } from "@/lib/rssService";

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

        const results = await Promise.allSettled(
          RSS_SOURCES.map(async (source) => ({
            source,
            items: await fetchSingleFeed(source),
          }))
        );

        for (const result of results) {
          if (cancelled) return;

          if (result.status === "fulfilled" && result.value.items.length > 0) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  source: result.value.source,
                  items: result.value.items,
                }) + "\n"
              )
            );
          } else if (result.status === "rejected") {
            console.error("Unable to fetch an RSS source:", result.reason);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
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
