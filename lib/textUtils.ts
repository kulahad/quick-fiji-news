export function stripHtml(html: string) {
  if (!html) return "";

  // Remove JSON-LD scripts and other script tags
  const withoutScripts = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove any remaining JSON-like content that might be part of the text
  const withoutJsonLd = withoutScripts.replace(
    /\{[\s\S]*?"@context"[\s\S]*?\}/g,
    ""
  );

  // Create a temporary element and parse remaining HTML
  const doc = new DOMParser().parseFromString(withoutJsonLd, "text/html");

  // Get the text content
  const text = doc.body.textContent || "";

  // Clean up extra whitespace
  return text.replace(/\s+/g, " ").trim();
}

export function truncateText(text: string, maxLength: number = 200) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Format volume information for display
export function formatVolumeInfo(volume?: {
  number: string;
  issue: string;
}): string {
  if (!volume) return "";

  // Parse year and month from volume number
  const [year, month] = volume.number.split("-").map((n) => parseInt(n));
  const weekNumber = parseInt(volume.issue);

  // Get month name
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = monthNames[month - 1];

  // Format as "Week X of MonthName YYYY"
  return `Week ${weekNumber} of ${monthName} ${year}`;
}

export function calculateVolumeInfo(date: Date = new Date()): {
  volume: string;
  issueNumber: string;
} {
  // Start date of publication (assuming it's when Vol. 1 No. 1 was published)
  const startDate = new Date("2000-01-01"); // This would make 2024 be Vol. XXIV

  // Calculate volume (year difference from start date)
  const volumeNumber = date.getFullYear() - startDate.getFullYear();

  // Convert to Roman numerals
  const volumeRoman = toRomanNumeral(volumeNumber);

  // Calculate issue number (day of the year)
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const issueNumber = (diffDays + 1).toLocaleString(); // Add 1 to start from 1 instead of 0

  return {
    volume: volumeRoman,
    issueNumber: issueNumber,
  };
}

function toRomanNumeral(num: number): string {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}
