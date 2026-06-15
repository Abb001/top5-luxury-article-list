# Top 5 Luxury Article List

這是一個靜態網站版本，會透過 GitHub Actions 自動抓取每日精品 / 奢侈品新聞。

## 功能

- 首頁只顯示台灣時間「今天」發布的新聞。
- 不會用前一天新聞補今天。
- 歷史搜尋支援指定日期，例如 `index.html?date=2026-06-13`。
- 歷史頁面有「返回今日新聞」按鈕。
- GitHub Actions 每天台灣時間 08:00、11:00、14:00、17:00、20:00、23:00 自動更新。
- 如果資料沒有變化，workflow 會略過 commit，減少等待時間。

## GitHub Pages 設定

到 repo 的 Settings → Pages，Source 建議選 `GitHub Actions`。

## 本地測試

```bash
npm ci
npm run fetch:backfill
npm run build
```

然後開啟 `index.html` 查看。
