const TZ = "Asia/Taipei";

const list = document.querySelector("#list");
const empty = document.querySelector("#empty");
const history = document.querySelector("#history");
const title = document.querySelector("#title");
const backBtn = document.querySelector("#backBtn");
const todayLabel = document.querySelector("#todayLabel");

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
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

    const url = article.url || "#";
    const articleTitle = article.title || "Untitled article";
    const description = article.description || "";
    const source = article.source || "Unknown source";
    const publishedAt = article.publishedAt || "";

    li.innerHTML = `
      ${url}${articleTitle}</a>
      <p>${description}</p>
      <div class="meta">${source} · ${publishedAt}</div>
    `;

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
  backBtn.onclick = () => {
    window.location.href = "index.html";
  };

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
