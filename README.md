# 前五大精品品牌純文章列表 Agent — 嚴格當日版

本版已縮短搜尋時間，並採用「嚴格當日模式」。

## 日期規則

- `2026-06-16` 產生的頁面只會顯示發布日期換算成台灣時間後為 `2026-06-16` 的文章。
- `2026-06-15` 發布的新聞不會出現在 `2026-06-16` 頁面。
- 沒有 RSS 發布時間的文章會被排除，避免混入舊資料。
- `lookback_days` 已縮短為 `1`。

## 執行

```bash
python3 -m pip install -r requirements.txt
python3 top5_luxury_plain_list_agent.py --json
open docs/index.html
```

## GitHub Pages base path

如果 repo 名稱不是 `top5-luxury-article-list`，請修改：

```python
'base_path': '/top5-luxury-article-list'
```
