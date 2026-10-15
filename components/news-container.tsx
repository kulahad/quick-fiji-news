"use client";
import { useState } from "react";
import { NewsCategory } from "@/types/news";
import NewsFeed from "./news-feed";
import { NewsFilters } from "./news-filters";

const ALL_SOURCES = [
  "fbcnews.com.fj",
  "fijivillage.com",
  "fijilive.com",
  "fijionenews.com.fj",
  "fijisun.com.fj",
  "fijitimes.com.fj",
  "islandsbusiness.com",
];

const ALL_CATEGORIES: NewsCategory[] = [
  "Politics",
  "Local",
  "Business",
  "Health",
  "Sports",
  "Technology",
  "World",
];

export default function NewsContainer() {
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES);
  const [selectedCategories, setSelectedCategories] =
    useState<NewsCategory[]>(ALL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "local-first">(
    "latest"
  );
  const activeFilterCount =
    Number(
      selectedSources.length !== ALL_SOURCES.length ||
        ALL_SOURCES.some((source) => !selectedSources.includes(source))
    ) +
    Number(
      selectedCategories.length !== ALL_CATEGORIES.length ||
        ALL_CATEGORIES.some((category) => !selectedCategories.includes(category))
    ) +
    Number(searchQuery.trim().length > 0) +
    Number(sortOption !== "latest");

  const clearFilters = () => {
    setSelectedSources(ALL_SOURCES);
    setSelectedCategories(ALL_CATEGORIES);
    setSearchQuery("");
    setSortOption("latest");
  };

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
          selectAllSources={() =>
            setSelectedSources(ALL_SOURCES)
          }
          selectAllCategories={() =>
            setSelectedCategories(ALL_CATEGORIES)
          }
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
        />
      </div>
      <section className="flex-1 min-w-0" aria-label="News articles">
        <NewsFeed
          sources={selectedSources}
          categories={selectedCategories}
          searchQuery={searchQuery}
          sortOption={sortOption}
        />
      </section>
    </div>
  );
}
