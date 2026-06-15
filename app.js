const TAIWAN_TIME_ZONE = "Asia/Taipei";

const articleList = document.querySelector("#articleList");
const emptyState = document.querySelector("#emptyState");
const historyList = document.querySelector("#historyList");
const dateTitle = document.querySelector("#dateTitle");
const pageLabel = document.querySelector("#pageLabel");
const backTodayBtn = document.querySelector("#backTodayBtn");

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIWAN_TIME_ZONE,
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

function formatDate(date) {
  return date.replaceAll("-", "/");
}

async function getJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Unable to load ${url}`);
  return res.json();
}

function renderArticles(data) {
  articleList.innerHTML = "";
  const articles = data.articles || [];

  if (!articles.length) {
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = `
      <strong>${formatDate(data.date)} 目前沒有符合條件的新聞。</strong><br />
      ${data.message || "系統會在今天稍晚自動更新；不會用其他日期的新聞補上。"}
    `;
    return;
  }

  emptyState.classList.add("hidden");
  for (const article of articles) {
    const li = document.createElement("li");
    li.className = "article-item";
    li.innerHTML = `
      <div>
        <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
        <p>${article.description || "No summary available."}</p>
        <div class="meta">${article.source || "Unknown source"} · ${article.publishedAt || ""}</div>
      </div>
    `;
    articleList.appendChild(li);
  }
}

function renderHistory(manifest, currentDate) {
  historyList.innerHTML = "";
  const today = todayInTaiwan();
  const dates = [...new Set([today, "2026-06-13", "2026-06-12", ...(manifest.dates || [])])]
    .sort()
    .reverse();

  for (const date of dates) {
    const link = document.createElement("a");
    link.className = `history-link ${date === currentDate ? "active" : ""}`;
    link.href = date === today ? "index.html" : `index.html?date=${date}`;
    link.innerHTML = `<span>${formatDate(date)}</span><small>${date === today ? "今日" : "歷史"}</small>`;
    historyList.appendChild(link);
  }
}

async function main() {
  const date = selectedDate();
  const today = todayInTaiwan();
  const isToday = date === today;

  pageLabel.textContent = isToday ? "今日新聞" : "歷史搜尋";
  dateTitle.textContent = `${formatDate(date)} 新聞`;
  backTodayBtn.classList.toggle("hidden", isToday);
  backTodayBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  try {
    const [manifest, data] = await Promise.all([
      getJson("data/manifest.json").catch(() => ({ dates: [today, "2026-06-13", "2026-06-12"] })),
      getJson(`data/${date}.json`)
    ]);
    renderHistory(manifest, date);
    renderArticles(data);
  } catch (error) {
    renderHistory({ dates: [today, "2026-06-13", "2026-06-12"] }, date);
    articleList.innerHTML = "";
    emptyState.classList.remove("hidden");
    emptyState.textContent = `找不到 ${formatDate(date)} 的資料檔。下一次自動更新後會重新產生。`;
  }
}

main();
