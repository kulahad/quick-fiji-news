"use client";

import { Filter, Search, Clock, MapPin } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NewsCategory } from "@/types/news";
import { SiteAttribution } from "@/components/site-attribution";

export const SOURCES = [
  { id: "fbcnews", label: "FBC News", value: "fbcnews.com.fj" },
  {
    id: "islandsbusiness",
    label: "Islands Business",
    value: "islandsbusiness.com",
  },
  { id: "fijilive", label: "Fiji Live", value: "fijilive.com" },
  { id: "fijionenews", label: "Fiji One News", value: "fijionenews.com.fj" },
  { id: "fijisun", label: "Fiji Sun", value: "fijisun.com.fj" },
  { id: "fijitimes", label: "Fiji Times", value: "fijitimes.com.fj" },
  { id: "fijivillage", label: "Fiji Village", value: "fijivillage.com" },
] as const;

const CATEGORIES: NewsCategory[] = [
  "Local",
  "Technology",
  "Business",
  "Health",
  "World",
  "Sports",
];

type SortOption = "latest" | "local-first";

interface NewsFiltersProps {
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
  selectedCategories: NewsCategory[];
  setSelectedCategories: (categories: NewsCategory[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: SortOption;
  setSortOption: (sort: SortOption) => void;
  selectAllSources: () => void;
  selectAllCategories: () => void;
  activeFilterCount: number;
  clearFilters: () => void;
}

export function NewsFilters({
  selectedSources,
  setSelectedSources,
  selectedCategories,
  setSelectedCategories,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  selectAllSources,
  selectAllCategories,
  activeFilterCount,
  clearFilters,
}: NewsFiltersProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchField = (
    <div className="relative">
      <Label htmlFor="article-search" className="sr-only">
        Search articles
      </Label>
      <Search
        aria-hidden="true"
        className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
      />
      <Input
        id="article-search"
        type="search"
        placeholder="Search articles..."
        className="pl-8 border-black dark:border-gray-800"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  const filterContent = (
    <div className="space-y-6">
      {!isMobile && searchField}
      {!isMobile && <Separator className="bg-black/20 dark:bg-white/20" />}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full justify-start"
        >
          Clear {activeFilterCount} active{" "}
          {activeFilterCount === 1 ? "filter" : "filters"}
        </Button>
      )}
      <Accordion type="multiple" defaultValue={["sort"]} className="w-full">
        <AccordionItem value="sort" className="border-b-0">
          <AccordionTrigger className="font-heading py-2 hover:no-underline">
            Sort By
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-2">
            <div className="flex flex-col gap-2">
              <Button
                variant={sortOption === "latest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("latest")}
                className="justify-start"
              >
                <Clock className="mr-2 h-4 w-4" />
                Latest First
              </Button>
              <Button
                variant={sortOption === "local-first" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("local-first")}
                className="justify-start"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Local News First
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="sources" className="border-b-0">
          <AccordionTrigger className="font-heading py-2 hover:no-underline">
            Sources
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-2">
            <div className="space-y-2">
              {SOURCES.map((source) => (
                <div key={source.id} className="flex items-center space-x-2">
                  <Switch
                    id={`source-${source.id}`}
                    checked={selectedSources.includes(source.value)}
                    onCheckedChange={(checked) => {
                      setSelectedSources(
                        checked
                          ? [...selectedSources, source.value]
                          : selectedSources.filter((s) => s !== source.value)
                      );
                    }}
                  />
                  <Label htmlFor={`source-${source.id}`}>{source.label}</Label>
                </div>
              ))}
            </div>
            {selectedSources.length < SOURCES.length && (
              <Button
                variant="link"
                size="sm"
                onClick={selectAllSources}
                className="mt-2 h-auto px-0"
              >
                Select all sources
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="categories" className="border-b-0">
          <AccordionTrigger className="font-heading py-2 hover:no-underline">
            Categories
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-2">
            <div className="space-y-2">
              {CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Switch
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      setSelectedCategories(
                        checked
                          ? [...selectedCategories, category]
                          : selectedCategories.filter((c) => c !== category)
                      );
                    }}
                  />
                  <Label htmlFor={`category-${category}`}>{category}</Label>
                </div>
              ))}
            </div>
            {selectedCategories.length < CATEGORIES.length && (
              <Button
                variant="link"
                size="sm"
                onClick={selectAllCategories}
                className="mt-2 h-auto px-0"
              >
                Select all categories
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Separator className="bg-black/20 dark:bg-white/20" />
      {/* Attribution */}
      <div className="space-y-2 pt-2">
        <SiteAttribution />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{searchField}</div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="relative h-11 shrink-0 px-3"
                aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
              >
                <Filter aria-hidden="true" className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85vw] overflow-y-auto pb-8 sm:w-[385px]"
            >
              <SheetHeader className="mb-4">
                <SheetTitle className="font-heading">Filters</SheetTitle>
              </SheetHeader>
              {filterContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return filterContent;
}
