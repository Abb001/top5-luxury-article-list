const TZ = "Asia/Taipei";

const list = document.getElementById("list");
const empty = document.getElementById("empty");
const history = document.getElementById("history");
const title = document.getElementById("title");
const backBtn = document.getElementById("backBtn");
const todayLabel = document.getElementById("todayLabel");

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const obj = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function selectedDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || todayInTaiwan();
}

async function loadJson(path) {
  const response = await fetch(`${path}?v=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Cannot load ${path}`);
  }
  return response.json();
}

function renderArticles(data) {
  list.innerHTML = "";

  const articles = Array.isArray(data.articles) ? data.articles : [];

  if (articles.length === 0) {
    empty.classList.remove("hidden");
    empty.textContent =
      data.message ||
      "No articles were found for this date yet. The system will keep checking during the next scheduled updates.";
    return;
  }

  empty.classList.add("hidden");

  for (const article of articles) {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.href = article.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = article.title || "Untitled article";

    const description = document.createElement("p");
    description.textContent = article.description || "";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${article.source || "Unknown source"} · ${article.publishedAt || ""}`;

    li.appendChild(link);
    li.appendChild(description);
    li.appendChild(meta);
    list.appendChild(li);
  }
}

function renderHistory(manifest, currentDate) {
  history.innerHTML = "";

  const today = todayInTaiwan();

  const dates = [
    today,
    "2026-06-15",
    "2026-06-14",
    "2026-06-13",
    "2026-06-12",
    ...(Array.isArray(manifest.dates) ? manifest.dates : [])
  ];

  const uniqueDates = [...new Set(dates)].sort().reverse();

  for (const date of uniqueDates) {
    const link = document.createElement("a");
    link.href = date === today ? "index.html" : `index.html?date=${date}`;
    link.textContent = date === today ? `${date} Today` : date;

    if (date === currentDate) {
      link.classList.add("active");
    }

    history.appendChild(link);
  }
}

async function main() {
  const date = selectedDate();
  const today = todayInTaiwan();
  const isToday = date === today;

  todayLabel.textContent = `Today in Taiwan: ${today}`;
  title.textContent = isToday ? "Today's Luxury News" : `Luxury News for ${date}`;

  backBtn.classList.toggle("hidden", isToday);
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  const manifest = await loadJson("data/manifest.json").catch(() => ({
    dates: [today, "2026-06-15", "2026-06-14", "2026-06-13", "2026-06-12"]
  }));

  renderHistory(manifest, date);

  const data = await loadJson(`data/${date}.json`).catch(() => ({
    date,
    articles: [],
    message: `No data file was found for ${date}. The next scheduled update may generate it.`
  }));

  renderArticles(data);
}

main().catch((error) => {
  console.error(error);
  title.textContent = "Unable to load luxury news";
  empty.classList.remove("hidden");
  empty.textContent = "Something went wrong while loading the news data. Please try again later.";
});
