import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchLiveNews } from "@/lib/live-news";

export const NEWS_STATIC_PATH = "public/news/latest.json";
const MAX_STATIC_ITEMS = 240;

async function main() {
  const { items, totalItems, ...rest } = await fetchLiveNews().then(
    (result) => ({
      ...result,
      totalItems: result.items.length,
    })
  );

  const payload = {
    items: items.slice(0, MAX_STATIC_ITEMS),
    totalItems,
    sourcesCount: new Set(items.map((item) => item.source)).size,
    failedSources: rest.sources
      .filter((source) => source.error !== null)
      .map((source) => source.source),
    stale: rest.partial,
    partial: rest.partial,
    sources: rest.sources,
    updatedAt: rest.updatedAt,
  };

  const outputPath = path.resolve(NEWS_STATIC_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload), "utf8");

  console.log(
    `Wrote ${payload.items.length} items to ${NEWS_STATIC_PATH} (updatedAt=${payload.updatedAt})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
