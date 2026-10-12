"use client";

import * as React from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Client-side only
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);

      // Update state initially
      setMatches(media.matches);

      // Set up listeners for changes
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      media.addEventListener("change", listener);

      // Cleanup
      return () => media.removeEventListener("change", listener);
    }
  }, [query]); // Re-run effect when query changes

  return matches;
}
