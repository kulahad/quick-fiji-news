import { NewsCategory } from "@/types/news";

interface CategoryRule {
  keywords: string[];
  weight: number;
  requireMultipleMatches?: boolean;
  excludeIfContains?: string[];
  contextPatterns?: RegExp[];
}

export const CATEGORY_RULES: Record<
  Exclude<NewsCategory, "All">,
  CategoryRule
> = {
  Local: {
    keywords: [
      "fiji",
      "suva",
      "nadi",
      "lautoka",
      "labasa",
      "pacific",
      "fijian",
      "police",
      "court",
      "magistrate",
      "crime",
      "arrest",
      "charged",
    ],
    weight: 1,
    excludeIfContains: [
      "international",
      "global",
      "foreign",
      "overseas",
      "worldwide",
    ],
    contextPatterns: [
      /\b(?:in|at|from|near)\s+(?:fiji|suva|nadi|lautoka|labasa)\b/i,
      /\bfijian?\s+(?:community|government|people|residents|police|court)\b/i,
      /\b(?:charged|arrested|appeared|sentenced)\s+(?:in|at|by)\s+(?:court|police)\b/i,
      /\b(?:drug|murder|robbery|theft|assault)\s+(?:case|charge|incident)\b/i,
    ],
  },
  Politics: {
    keywords: [
      "parliament",
      "minister",
      "government",
      "policy",
      "election",
      "opposition",
      "bill",
      "law",
      "legislation",
      "cabinet",
      "politics",
    ],
    weight: 0.8,
    // requireMultipleMatches: true, // Removed
    contextPatterns: [
      /\b(?:prime minister|attorney general|opposition leader|member of parliament)\b/i,
      /\b(?:political party|government policy|election campaign|parliamentary debate)\b/i,
      /\b(?:passes bill|enacts law|introduces legislation)\b/i,
    ],
  },
  Technology: {
    keywords: [
      "technology",
      "digital",
      "internet",
      "cyber",
      "software",
      "ai",
      "computer",
    ],
    weight: 0.7,
    // requireMultipleMatches: true, // Removed
    excludeIfContains: [
      "technician",
      "technical foul",
      "police",
      "court",
      "drug",
    ],
    contextPatterns: [
      /\b(?:launch|develop|implement|introduce)\s+(?:technology|system|platform)\b/i,
      /\b(?:digital|tech|online)\s+(?:services|solutions|infrastructure)\b/i,
      /\b(?:artificial intelligence|machine learning|automation|innovation)\b/i,
    ],
  },
  Business: {
    keywords: [
      "business",
      "economy",
      "market",
      "trade",
      "finance",
      "investment",
    ],
    weight: 0.7,
    // requireMultipleMatches: true, // Removed
    contextPatterns: [
      /\b(?:million|billion)\s+(?:dollars|FJD)\b/i,
      /\b(?:company|business|firm)\s+(?:announces|reports|launches)\b/i,
      /\b(?:market|economic|financial)\s+(?:growth|development|forecast)\b/i,
    ],
  },
  Health: {
    keywords: [
      "health",
      "medical",
      "hospital",
      "disease",
      "healthcare",
      "covid",
    ],
    weight: 0.8,
    contextPatterns: [
      /\b(?:health|medical|hospital)\s+(?:care|services|treatment)\b/i,
      /\b(?:ministry of health|public health|healthcare)\b/i,
    ],
  },
  World: {
    keywords: ["international", "global", "foreign", "overseas", "worldwide"],
    weight: 0.6,
    excludeIfContains: ["local", "fiji", "pacific"],
    contextPatterns: [
      /\b(?:international|global|world)\s+(?:community|market|stage)\b/i,
      /\b(?:foreign|overseas)\s+(?:relations|policy|trade)\b/i,
    ],
  },
  Sports: {
    keywords: ["sports", "rugby", "football", "cricket", "game", "match"],
    weight: 0.9,
    contextPatterns: [
      /\b(?:win|lose|defeat|victory|score)\b/i,
      /\b(?:team|player|coach|tournament|championship)\b/i,
      /\b(?:rugby|football|cricket|athletics)\s+(?:match|game|tournament|team)\b/i,
    ],
  },
};

function getKeywordMatches(text: string, keywords: string[]): number {
  const normalizedText = text.toLowerCase();
  return keywords.reduce(
    (count, keyword) =>
      count + (normalizedText.includes(keyword.toLowerCase()) ? 1 : 0),
    0
  );
}

function getContextMatches(text: string, patterns?: RegExp[]): number {
  if (!patterns) return 0;
  return patterns.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
}

export function categorizeText(title: string, content: string): NewsCategory[] {
  const text = `${title} ${content}`.toLowerCase();
  const scores = new Map<NewsCategory, number>();

  Object.entries(CATEGORY_RULES).forEach(([category, rule]) => {
    const categoryName = category as Exclude<NewsCategory, "All">;

    // Check exclusions first
    if (
      rule.excludeIfContains?.some((term) => text.includes(term.toLowerCase()))
    ) {
      return;
    }

    const keywordMatches = getKeywordMatches(text, rule.keywords);
    const contextMatches = getContextMatches(text, rule.contextPatterns);

    // Skip if we require multiple matches and don't have them
    if (rule.requireMultipleMatches && keywordMatches < 2) {
      return;
    }

    // Calculate score based on matches and weight
    const score = (keywordMatches + contextMatches * 1.5) * rule.weight;
    if (score > 0.6) {
      // Increased threshold for category inclusion
      scores.set(categoryName, score);
    }
  });

  // If no categories matched, default to Local for Fiji news
  if (scores.size === 0 && text.includes("fiji")) {
    return ["Local"];
  }

  // Sort by score and take top 2 categories
  return Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2) // Limit to top 2 categories
    .map(([category]) => category);
}

export function categorizeFromRssCategories(
  rssCategories: string[]
): NewsCategory[] {
  const matchedCategories: NewsCategory[] = [];
  const processedCategories = new Set<NewsCategory>();

  const categoryMap: Record<string, NewsCategory | null> = {
    // Allow null for special handling
    News: "Local", // Default mapping for generic 'News'
    "Local News": "Local", // Mapping for 'Local News'
    Politics: "Politics", // Mapping for 'Politics'
    Technology: "Technology", // Mapping for 'Technology'
    Business: "Business", // Mapping for 'Business'
    Economy: "Business", // Mapping for 'Economy'
    Health: "Health", // Mapping for 'Health'
    Medical: "Health", // Mapping for 'Medical'
    World: "World", // Mapping for 'World'
    International: "World", // Mapping for 'International'
    Sports: "Sports", // Mapping for 'Sports'
    Rugby: "Sports", // Mapping for 'Rugby'
    Football: "Sports", // Mapping for 'Football'
    Cricket: "Sports", // Mapping for 'Cricket'
    Entertainment: null, // Special handling for 'Entertainment'
    // Add more specific mappings if needed based on common RSS categories
  };

  let entertainmentPresentInRss = false;

  // First pass: Check for direct mappings and presence of 'Entertainment' in original RSS categories
  for (const rssCategory of rssCategories) {
    if (typeof rssCategory !== "string") continue;

    if (rssCategory === "Entertainment") {
      entertainmentPresentInRss = true;
      continue; // Skip direct mapping for Entertainment
    }

    const mappedCategory = categoryMap[rssCategory];
    if (mappedCategory && !processedCategories.has(mappedCategory)) {
      matchedCategories.push(mappedCategory);
      processedCategories.add(mappedCategory);
    }
  }

  // Handle Entertainment after the first pass
  if (entertainmentPresentInRss) {
    if (processedCategories.has("Local")) {
      // If Local was a direct match, add Local (already added if it was a direct match, but for clarity)
      if (!processedCategories.has("Local")) {
        matchedCategories.push("Local");
        processedCategories.add("Local");
      }
    } else {
      // If Local was not a direct match, add World (if not already added)
      if (!processedCategories.has("World")) {
        matchedCategories.push("World");
        processedCategories.add("World");
      }
    }
  }

  // If direct matches (including conditional Entertainment) were found, return them.
  if (matchedCategories.length > 0) {
    return matchedCategories;
  }

  // Second pass: If no direct matches, check against CATEGORY_RULES keywords as a fallback
  for (const rssCategory of rssCategories) {
    if (typeof rssCategory !== "string") continue;
    const normalizedRssCategory = rssCategory.toLowerCase();
    for (const appCategory in CATEGORY_RULES) {
      const rule = CATEGORY_RULES[appCategory as Exclude<NewsCategory, "All">];
      if (
        rule.keywords.some((keyword) =>
          normalizedRssCategory.includes(keyword.toLowerCase())
        ) &&
        !processedCategories.has(appCategory as NewsCategory)
      ) {
        matchedCategories.push(appCategory as NewsCategory);
        processedCategories.add(appCategory as NewsCategory);
        // If a keyword match is found, no need to check other keywords for this rssCategory
        break;
      }
    }
  }

  // If no categories matched through either method, default to Local if any RSS category contains "Fiji" or related terms
  if (
    matchedCategories.length === 0 &&
    rssCategories.some(
      (cat) =>
        typeof cat === "string" && // Added check
        (cat.toLowerCase().includes("fiji") ||
          cat.toLowerCase().includes("pacific"))
    )
  ) {
    return ["Local"];
  }

  return matchedCategories;
}
