export type NewsCategory =
  | "Local"
  | "Politics"
  | "Technology"
  | "Business"
  | "Health"
  | "World"
  | "Sports"
  | "All";

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
  guid: string;
  categories: NewsCategory[];
  volume?: {
    number: string;
    issue: string;
  };
}

export interface FeedResponse {
  items: NewsItem[];
  error?: string;
}
