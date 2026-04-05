import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

const TRIPS_DIR = path.join(process.cwd(), "trips");

export interface TripMeta {
  slug: string;
  title: string;
  period?: string;
  cities?: string;
  theme?: string;
  coverCity?: string;
}

export interface TripOverview {
  slug: string;
  title: string;
  content: string;
}

export interface DayEntry {
  slug: string;
  dayNum: number;
  date: string;
  city: string;
  filename: string;
  content: string;
}

/** Returns all trip directory names (slugs), sorted alphabetically */
export function getAllTripSlugs(): string[] {
  if (!fs.existsSync(TRIPS_DIR)) return [];
  return fs
    .readdirSync(TRIPS_DIR)
    .filter((e) => fs.statSync(path.join(TRIPS_DIR, e)).isDirectory())
    .sort();
}

/** Returns trip metadata for all trips (for the home listing) */
export async function getAllTrips(): Promise<TripMeta[]> {
  const slugs = getAllTripSlugs();
  const result: TripMeta[] = [];

  for (const slug of slugs) {
    const overviewPath = path.join(TRIPS_DIR, slug, "overview.md");
    if (!fs.existsSync(overviewPath)) {
      result.push({ slug, title: slug });
      continue;
    }
    const raw = fs.readFileSync(overviewPath, "utf-8");
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;

    // Extract period
    const periodMatch = raw.match(/[*_]?기간[*_]?\s*[:：]\s*(.+)/);
    const period = periodMatch ? periodMatch[1].trim() : undefined;

    // Extract theme
    const themeMatch = raw.match(/[*_]?테마[*_]?\s*[:：]\s*(.+)/);
    const theme = themeMatch ? themeMatch[1].trim() : undefined;

    // Extract cities from route block
    const routeMatch = raw.match(/```[\s\S]*?→([\s\S]*?)```/);
    let cities: string | undefined;
    if (routeMatch) {
      const routeLine = raw.match(/```\n(.+)\n```/);
      cities = routeLine ? routeLine[1].trim() : undefined;
    } else {
      // Fallback: extract from title or slug
      cities = slug.split("-").slice(2).join(", ").replace(/-/g, " ");
    }

    // First city as cover
    const coverCity = slug.split("-").slice(2, 3).join("") || "lisbon";

    result.push({ slug, title, period, cities, theme, coverCity });
  }
  return result;
}

function getTripDir(slug: string): string {
  return path.join(TRIPS_DIR, slug);
}

/** Legacy helper: returns first trip dir (backward compat) */
function getActiveTripDir(): string {
  const slugs = getAllTripSlugs();
  if (slugs.length === 0) throw new Error("No trip directories found");
  return path.join(TRIPS_DIR, slugs[0]);
}

function maskSensitive(md: string): string {
  // Mask flight PNR codes (6-char uppercase+digit in table cells)
  return md.replace(/\|\s*([A-Z0-9]{6})\s*\|/g, (_, pnr) => `| ${pnr.slice(0, 2)}**** |`);
}

/** Add data-label attributes to table cells for mobile card layout */
function addTableLabels(htmlStr: string): string {
  return htmlStr.replace(/<table>[\s\S]*?<\/table>/g, (table) => {
    // Extract headers from thead only
    const theadMatch = table.match(/<thead>([\s\S]*?)<\/thead>/);
    if (!theadMatch) return `<div class="table-cards">${table}</div>`;

    const headers: string[] = [];
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
    let thMatch;
    while ((thMatch = thRegex.exec(theadMatch[1])) !== null) {
      headers.push(thMatch[1].replace(/<[^>]*>/g, "").trim());
    }
    if (headers.length === 0) return `<div class="table-cards">${table}</div>`;

    // Add data-label to each td in tbody
    const tbodyMatch = table.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!tbodyMatch) return `<div class="table-cards">${table}</div>`;

    let rowIndex = 0;
    const labeledTbody = tbodyMatch[1].replace(/<tr>([\s\S]*?)<\/tr>/g, (_, rowContent) => {
      let colIndex = 0;
      const labeledCells = rowContent.replace(/<td([^>]*)>([\s\S]*?)<\/td>/g, (_: string, attrs: string, content: string) => {
        const label = headers[colIndex % headers.length];
        colIndex++;
        return `<td${attrs} data-label="${label}">${content}</td>`;
      });
      rowIndex++;
      return `<tr>${labeledCells}</tr>`;
    });

    const result = table.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${labeledTbody}</tbody>`);
    return `<div class="table-cards">${result}</div>`;
  });
}

/** External links open in new tab */
function externalLinksNewTab(htmlStr: string): string {
  return htmlStr.replace(
    /<a href="(https?:\/\/[^"]+)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"'
  );
}

async function markdownToHtml(md: string): Promise<string> {
  const masked = maskSensitive(md);
  const result = await remark().use(remarkGfm).use(html, { sanitize: false }).process(masked);
  return externalLinksNewTab(addTableLabels(result.toString()));
}

/** Strip the first H1 heading from HTML (to avoid duplicate with page header) */
export function stripFirstH1(html: string): string {
  return html.replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
}

// ── Per-trip API ─────────────────────────────────────────────────────────────

export async function getTripOverview(slug?: string): Promise<TripOverview> {
  const tripDir = slug ? getTripDir(slug) : getActiveTripDir();
  const resolvedSlug = slug ?? path.basename(tripDir);
  const overviewPath = path.join(tripDir, "overview.md");
  const raw = fs.readFileSync(overviewPath, "utf-8");
  const content = await markdownToHtml(raw);
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : resolvedSlug;
  return { slug: resolvedSlug, title, content };
}

export async function getItinerary(slug?: string): Promise<string> {
  const tripDir = slug ? getTripDir(slug) : getActiveTripDir();
  const itineraryPath = path.join(tripDir, "itinerary.md");
  if (!fs.existsSync(itineraryPath)) return "";
  const raw = fs.readFileSync(itineraryPath, "utf-8");
  return markdownToHtml(raw);
}

export async function getAllDays(slug?: string): Promise<DayEntry[]> {
  const tripDir = slug ? getTripDir(slug) : getActiveTripDir();
  const dailyDir = path.join(tripDir, "daily");
  if (!fs.existsSync(dailyDir)) return [];

  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const days: DayEntry[] = [];
  for (const filename of files) {
    const match = filename.match(/^day(\d+)-(\d{4})-(.+)\.md$/);
    if (!match) continue;

    const dayNum = parseInt(match[1], 10);
    const date = match[2];
    const city = match[3].replace(/-/g, " ");
    const raw = fs.readFileSync(path.join(dailyDir, filename), "utf-8");
    const contentRaw = await markdownToHtml(raw);
    const content = stripFirstH1(contentRaw);

    days.push({
      slug: `${dayNum}`,
      dayNum,
      date: `${date.slice(0, 2)}.${date.slice(2)}`,
      city,
      filename,
      content,
    });
  }
  return days;
}

export async function getDay(dayNum: number, slug?: string): Promise<DayEntry | null> {
  const days = await getAllDays(slug);
  return days.find((d) => d.dayNum === dayNum) ?? null;
}

export async function getSupplementary(
  name: string,
  slug?: string
): Promise<string | null> {
  const tripDir = slug ? getTripDir(slug) : getActiveTripDir();
  const filePath = path.join(tripDir, `${name}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return markdownToHtml(raw);
}
