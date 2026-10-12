"use client";

import { Filter, Search, X, Clock, MapPin, ExternalLink } from "lucide-react";
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
  SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NewsCategory } from "@/types/news";
import Link from "next/link";

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
}: NewsFiltersProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const filterContent = (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search articles..."
          className="pl-8 border-black dark:border-gray-800"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Separator className="bg-black/20 dark:bg-white/20" />{" "}
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Separator className="bg-black/20 dark:bg-white/20" />
      {/* Attribution */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col space-y-1">
          <Link
            href="https://kulahad.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            Built by Mohammed Ahad <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="text-[11px] text-muted-foreground/60">
            Created with ❤️ in Fiji
          </span>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search articles..."
              className="pl-8 border-black dark:border-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[385px]">
              <SheetHeader className="mb-4">
                <SheetTitle className="font-heading">Filters</SheetTitle>
              </SheetHeader>
              {filterContent}
              <div className="absolute bottom-4 right-4">
                <SheetClose asChild>
                  <Button variant="outline" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return filterContent;
}
