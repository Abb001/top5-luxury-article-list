import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const DATA_DIR = path.resolve("data");
const TAIWAN_TIME_ZONE = "Asia/Taipei";
const MAX_ARTICLES_PER_DAY = 5;

const FEEDS = [
  {
    name: "Google News - luxury fashion",
    url: "https://news.google.com/rss/search?q=luxury%20fashion%20OR%20luxury%20brand%20OR%20designer%20fashion%20when:7d&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - luxury business",
    url: "https://news.google.com/rss/search?q=luxury%20market%20OR%20LVMH%20OR%20Hermes%20OR%20Chanel%20OR%20Gucci%20when:7d&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - luxury lifestyle",
    url: "https://news.google.com/rss/search?q=luxury%20watches%20OR%20jewelry%20OR%20haute%20couture%20when:7d&hl=en-US&gl=US&ceid=US:en"
  }
];

function formatTaiwanDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIWAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function normalizeDateArg(value) {
  if (!value || value === "today") return formatTaiwanDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}. Expected YYYY-MM-DD or today.`);
  }
  return value;
}

function getDatesFromArgs() {
  const idx = process.argv.indexOf("--dates");
  if (idx === -1 || !process.argv[idx + 1]) return [formatTaiwanDate()];
  return [...new Set(process.argv[idx + 1].split(",").map((d) => normalizeDateArg(d.trim())))];
}

function stripHtml(text = "") {
  return String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function articleDateInTaiwan(article) {
  const rawDate = article.publishedAt || article.pubDate || article.isoDate || article.updated || "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;
  return formatTaiwanDate(date);
}

function scoreArticle(article) {
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
  const highSignalTerms = ["luxury", "lvmh", "hermès", "hermes", "chanel", "gucci", "prada", "dior", "cartier", "rolex", "fashion", "couture", "jewelry", "watch"];
  let score = 0;
  for (const term of highSignalTerms) {
    if (text.includes(term)) score += 2;
  }
  const timestamp = new Date(article.publishedAt || article.pubDate || 0).getTime();
  score += Math.max(0, timestamp / 1e13);
  return score;
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 luxury-news-bot/2.0"
    }
  });
  if (!res.ok) throw new Error(`${feed.name} failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item || [];
  return (Array.isArray(items) ? items : [items]).map((item) => ({
    title: stripHtml(item.title),
    url: item.link,
    source: stripHtml(item.source?.["#text"] || item.source || feed.name),
    publishedAt: item.pubDate || "",
    description: stripHtml(item.description || ""),
    feed: feed.name
  }));
}

function dedupeArticles(articles) {
  const seen = new Set();
  const result = [];
  for (const article of articles) {
    const key = `${article.title}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "").slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

async function readExisting(date) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${date}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function updateManifest(dates) {
  const files = await fs.readdir(DATA_DIR).catch(() => []);
  const availableDates = files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();

  const manifest = {
    generatedAt: new Date().toISOString(),
    timezone: TAIWAN_TIME_ZONE,
    latestDate: formatTaiwanDate(),
    dates: [...new Set([...dates, ...availableDates])].sort().reverse()
  };
  await writeJson(path.join(DATA_DIR, "manifest.json"), manifest);
}

async function main() {
  const targetDates = getDatesFromArgs();
  await fs.mkdir(DATA_DIR, { recursive: true });

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const allArticles = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
  const failures = settled.filter((item) => item.status === "rejected").map((item) => String(item.reason));

  for (const date of targetDates) {
    const todaysArticles = dedupeArticles(
      allArticles.filter((article) => articleDateInTaiwan(article) === date)
    )
      .sort((a, b) => scoreArticle(b) - scoreArticle(a))
      .slice(0, MAX_ARTICLES_PER_DAY);

    const existing = await readExisting(date);
    const payload = {
      date,
      timezone: TAIWAN_TIME_ZONE,
      generatedAt: new Date().toISOString(),
      status: todaysArticles.length ? "ok" : "empty",
      message: todaysArticles.length
        ? `Found ${todaysArticles.length} article(s) published on ${date}.`
        : `No articles published on ${date} were found yet. The scheduled workflow will check again later.`,
      articles: todaysArticles,
      fetchWarnings: failures
    };

    // Preserve existing non-empty historical data if this run finds nothing.
    if (existing?.articles?.length && todaysArticles.length === 0 && date !== formatTaiwanDate()) {
      await writeJson(path.join(DATA_DIR, `${date}.json`), {
        ...existing,
        generatedAt: new Date().toISOString(),
        fetchWarnings: failures
      });
    } else {
      await writeJson(path.join(DATA_DIR, `${date}.json`), payload);
    }
  }

  const today = formatTaiwanDate();
  const todayData = await readExisting(today);
  if (todayData) await writeJson(path.join(DATA_DIR, "latest.json"), todayData);
  await updateManifest(targetDates);

  console.log(`Updated dates: ${targetDates.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
