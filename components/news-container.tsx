"use client";
import { useState } from "react";
import { NewsCategory } from "@/types/news";
import NewsFeed from "./news-feed";
import { NewsFilters } from "./news-filters";

const ALL_SOURCES = [
  "fbcnews.com.fj",
  "islandsbusiness.com",
  "fijilive.com",
  "fijionenews.com.fj",
  "fijisun.com.fj",
  "fijitimes.com.fj",
];

const ALL_CATEGORIES: NewsCategory[] = [
  "Local",
  "Technology",
  "Business",
  "Health",
  "World",
  "Sports",
];

export default function NewsContainer() {
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES);
  const [selectedCategories, setSelectedCategories] =
    useState<NewsCategory[]>(ALL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "local-first">(
    "latest"
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      <div className="md:w-1/3 lg:w-1/4">
        <NewsFilters
          selectedSources={selectedSources}
          setSelectedSources={setSelectedSources}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortOption={sortOption}
          setSortOption={setSortOption}
        />
      </div>
      <main className="flex-1 min-w-0">
        <NewsFeed
          sources={selectedSources}
          categories={selectedCategories}
          searchQuery={searchQuery}
          sortOption={sortOption}
        />
      </main>
    </div>
  );
}
