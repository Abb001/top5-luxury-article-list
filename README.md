# 前五大精品品牌純文章列表 Agent — Archive 修正版

搜尋 Louis Vuitton、Chanel、Hermès、Gucci、Dior 相關網路文章與新聞。

本版修正：
- Archive 連結統一使用 `/top5-luxury-article-list/archive/YYYY-MM-DD.html`。
- 避免從歷史頁再次點擊時變成 `/archive/archive/` 而 404。
- Workflow 增加 `Check archive links`，未來如果產生 `archive/archive` 會直接失敗，不會把壞連結推上 GitHub Pages。

本版移除：
- 照片
- placeholder
- 卡片版面
- 監測品牌
- 最高聲量
- 主要議題
- 品牌聲量
- 議題分布
- 重點文章標題區
- 本期總覽
- 品牌聲量與重點文章
- 議題分布與趨勢觀察
- 本期商業洞察
- 文章數

本版只保留：
- 日期 + 前五大精品品牌文章列表 section
- 純文字文章列表
- 歷史搜尋 section

## 執行

```bash
python3 -m pip install -r requirements.txt
python3 top5_luxury_plain_list_agent.py --json
open docs/index.html
```

## 輸出

```text
docs/index.html
docs/archive/YYYY-MM-DD.html
docs/reports.json
reports/top5_luxury_articles_YYYY-MM-DD.md
data/top5_luxury_articles_YYYY-MM-DD.json
latest_top5_luxury_articles.json
```

## 如果 repo 改名

請修改 `top5_luxury_plain_list_agent.py` 裡的：

```python
'base_path': '/top5-luxury-article-list'
```
