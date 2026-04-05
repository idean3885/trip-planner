import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

const TRIPS_DIR = path.join(process.cwd(), "..", "trips");

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

function getActiveTripDir(): string {
  const entries = fs.readdirSync(TRIPS_DIR);
  const tripDirs = entries.filter((e) =>
    fs.statSync(path.join(TRIPS_DIR, e)).isDirectory()
  );
  if (tripDirs.length === 0) throw new Error("No trip directories found");
  return path.join(TRIPS_DIR, tripDirs[0]);
}

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark().use(remarkGfm).use(html).process(md);
  return result.toString();
}

export async function getTripOverview(): Promise<TripOverview> {
  const tripDir = getActiveTripDir();
  const slug = path.basename(tripDir);
  const overviewPath = path.join(tripDir, "overview.md");
  const raw = fs.readFileSync(overviewPath, "utf-8");
  const content = await markdownToHtml(raw);
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : slug;
  return { slug, title, content };
}

export async function getItinerary(): Promise<string> {
  const tripDir = getActiveTripDir();
  const itineraryPath = path.join(tripDir, "itinerary.md");
  if (!fs.existsSync(itineraryPath)) return "";
  const raw = fs.readFileSync(itineraryPath, "utf-8");
  return markdownToHtml(raw);
}

export async function getAllDays(): Promise<DayEntry[]> {
  const tripDir = getActiveTripDir();
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
    const content = await markdownToHtml(raw);

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

export async function getDay(dayNum: number): Promise<DayEntry | null> {
  const days = await getAllDays();
  return days.find((d) => d.dayNum === dayNum) ?? null;
}

export async function getSupplementary(
  name: string
): Promise<string | null> {
  const tripDir = getActiveTripDir();
  const filePath = path.join(tripDir, `${name}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return markdownToHtml(raw);
}
