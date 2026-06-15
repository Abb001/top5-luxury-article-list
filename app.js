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

  const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function getDate() {
  return new URLSearchParams(location.search).get("date") || todayInTaiwan();
}

async function loadJson(path) {
  const res = await fetch(`${path}?v=${Date.now()}`);
  if (!res.ok) throw new Error(path);
  return res.json();
}

function renderArticles(data) {
  list.innerHTML = "";
  const articles = data.articles || [];

  if (!articles.length) {
    empty.classList.remove("hidden");
    empty.textContent = data.message || "No articles were found for this date yet.";
    return;
  }

  empty.classList.add("hidden");

  for (const article of articles) {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a>
      <p>${article.description || ""}</p>
      <div class="meta">${article.source || ""} · ${article.publishedAt || ""}</div>
    `;
    list.appendChild(li);
  }
}

function renderHistory(manifest, currentDate) {
  history.innerHTML = "";
  const today = todayInTaiwan();

  const dates = [...new Set([
    today,
    "2026-06-15",
    "2026-06-14",
    "2026-06-13",
    "2026-06-12",
    ...(manifest.dates || [])
  ])].sort().reverse();

  for (const date of dates) {
    const a = document.createElement("a");
    a.href = date === today ? "index.html" : `index.html?date=${date}`;
    a.textContent = date === today ? `${date} Today` : date;
    history.appendChild(a);
  }
}

async function main() {
  const date = getDate();
  const today = todayInTaiwan();
  const isToday = date === today;

  todayLabel.textContent = `Today in Taiwan: ${today}`;
  title.textContent = isToday ? "Today's Luxury News" : `Luxury News for ${date}`;

  backBtn.classList.toggle("hidden", isToday);
  backBtn.onclick = () => location.href = "index.html";

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

main();
