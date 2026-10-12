import { fetchSingleFeed, RSS_SOURCES } from "@/lib/rssService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial response immediately
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "start" }) + "\n")
        );

        // Create an array of promises for parallel fetching
        const fetchPromises = RSS_SOURCES.map(async (source) => {
          try {
            const items = await fetchSingleFeed(source);
            if (items && items.length > 0) {
              // Send chunk of data
              const chunk = encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  source,
                  items,
                }) + "\n"
              );
              controller.enqueue(chunk);
            }
          } catch (sourceError) {
            console.error(`Error fetching ${source}:`, sourceError);
            // Send error for this source but continue
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  source,
                  error:
                    typeof sourceError === "object" &&
                    sourceError &&
                    "message" in sourceError
                      ? (sourceError as { message: string }).message
                      : String(sourceError),
                }) + "\n"
              )
            );
          }
        });

        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      } finally {
        // Send end message
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "end" }) + "\n")
        );
        controller.close();
      }
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
