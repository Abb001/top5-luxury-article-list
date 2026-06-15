
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
前五大精品品牌純文章列表 Agent
- 搜尋 Louis Vuitton / Chanel / Hermès / Gucci / Dior 相關網路文章與新聞
- 使用 Google News RSS + Yahoo News RSS
- 網站只保留：日期標題、純文字文章列表、歷史搜尋
- 不顯示照片、不顯示 placeholder、不使用卡片版面、不顯示統計與分析區塊
"""
import argparse, datetime as dt, hashlib, html, json, re, time
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote_plus
import feedparser, requests
from bs4 import BeautifulSoup

CONFIG = {
    'tz': 8,
    'lookback_days': 2,
    'max_items_per_query': 6,
    'max_articles_total': 60,
    'page_title': '前五大精品品牌文章搜尋',
    'page_subtitle': 'Louis Vuitton・Chanel・Hermès・Gucci・Dior 最新網路文章與新聞列表',
    'brands': ['Louis Vuitton','Chanel','Hermès','Gucci','Dior'],
    'queries': [
        '{brand} new collection',
        '{brand} new arrivals',
        '{brand} latest campaign',
        '{brand} fashion news',
        '{brand} product launch',
        '{brand} runway collection'
    ],
    'exclude': ['celebrity dating','gossip','red carpet','outfit','best dressed','worst dressed','tiktok drama','instagram drama']
}
DATA=Path('data'); REPORTS=Path('reports'); DOCS=Path('docs'); ARCH=DOCS/'archive'

def now(): return dt.datetime.utcnow()+dt.timedelta(hours=CONFIG['tz'])
def clean(x): return re.sub(r'\s+',' ',BeautifulSoup(x or '', 'html.parser').get_text(' ')).strip()
def parse_date(entry):
    for k in ['published','updated']:
        if k in entry:
            try: return parsedate_to_datetime(entry[k])
            except Exception: pass
    return None
def google_rss(q): return 'https://news.google.com/rss/search?q='+quote_plus(q+f' when:{CONFIG["lookback_days"]}d')+'&hl=zh-TW&gl=TW&ceid=TW:zh-Hant'
def yahoo_rss(q): return 'https://news.search.yahoo.com/rss?p='+quote_plus(q)+'&ei=UTF-8'
def article_id(title, source): return hashlib.sha256((title.lower()+source.lower()).encode('utf-8')).hexdigest()[:16]

def score_article(a):
    score=0
    t=(a.get('title','')+' '+a.get('summary','')+' '+a.get('brand','')).lower()
    for kw in ['collection','campaign','launch','runway','new arrivals','fashion','luxury','brand']:
        if kw in t: score += 2
    if a.get('provider') == 'Google News': score += 1
    if a.get('published'): score += 1
    return score

def fetch_feed(url, brand, query, provider):
    out=[]; cutoff=dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)-dt.timedelta(days=CONFIG['lookback_days'])
    try:
        r=requests.get(url,headers={'User-Agent':'Mozilla/5.0 Top5LuxuryPlainListAgent/1.0'},timeout=10)
        r.raise_for_status(); feed=feedparser.parse(r.content)
    except Exception as e:
        print(f'[WARN] {provider} failed: {query} -> {e}', flush=True); return out
    count=0
    for entry in feed.entries:
        if count>=CONFIG['max_items_per_query']: break
        pub=parse_date(entry)
        if pub and pub<cutoff: continue
        title=clean(entry.get('title','')); summary=clean(entry.get('summary','')); link=entry.get('link','')
        source=entry.source.get('title','') if hasattr(entry,'source') and entry.source else provider
        text=(title+' '+summary).lower()
        if not title or any(k in text for k in CONFIG['exclude']): continue
        out.append({'id':article_id(title,source),'brand':brand,'title':title,'summary':summary,'source':source,'provider':provider,'query':query,'link':link,'published':pub.isoformat() if pub else '', 'scraped_at':now().replace(microsecond=0).isoformat()})
        count+=1
    return out

def fetch_articles():
    articles=[]
    for brand in CONFIG['brands']:
        for tmpl in CONFIG['queries']:
            q=tmpl.format(brand=brand)
            print(f'[INFO] 搜尋文章：{q}', flush=True)
            articles += fetch_feed(google_rss(q), brand, q, 'Google News')
            articles += fetch_feed(yahoo_rss(q), brand, q, 'Yahoo News')
            time.sleep(0.2)
    seen=set(); ded=[]
    for a in sorted(articles, key=score_article, reverse=True):
        key=re.sub(r'[^a-z0-9\u4e00-\u9fff]+',' ',a['title'].lower())[:120]
        if key in seen: continue
        seen.add(key); ded.append(a)
    return ded[:CONFIG['max_articles_total']]

def build_markdown(articles):
    date=now().strftime('%Y-%m-%d')
    md=[f'## {date} 前五大精品品牌文章列表','']
    if not articles:
        md.append('* 本次沒有搜尋到文章。')
    for a in articles:
        md.append(f'* **{a["brand"]}**｜[{a["title"]}]({a["link"]})｜{a["source"]}｜{a.get("published","")[:10]}')
    return '\n'.join(md)

def article_list_html(articles):
    if not articles:
        return '<p class="muted">本次沒有搜尋到文章。</p>'
    items=[]
    for a in articles:
        date=a.get('published','')[:10] or '未標示日期'
        summary=html.escape(a.get('summary','')[:220])
        summary_html=f'<p class="summary">{summary}</p>' if summary else ''
        items.append(
            '<li class="article-row">'
            '<div class="meta"><span class="brand">'+html.escape(a['brand'])+'</span><span>'+html.escape(a['source'])+'</span><span>'+html.escape(date)+'</span></div>'
            '<a class="title" href="'+html.escape(a['link'])+'" target="_blank" rel="noopener">'+html.escape(a['title'])+'</a>'
            + summary_html +
            '</li>'
        )
    return '<ol class="article-list">'+'\n'.join(items)+'</ol>'

def render_site(articles):
    DOCS.mkdir(exist_ok=True); ARCH.mkdir(parents=True, exist_ok=True)
    date=now().strftime('%Y-%m-%d')
    archive_name=f'{date}.html'
    existing=sorted([p.name for p in ARCH.glob('*.html')]+[archive_name], reverse=True)
    unique=list(dict.fromkeys(existing))
    archive_links=''.join([f'<a href="archive/{n}">{n.replace(".html","")}</a>' for n in unique[:40]])
    css=':root{--card:#fffaf4;--ink:#241f1b;--muted:#76695d;--accent:#8b572f;--line:#e8d9c8}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC","Segoe UI",sans-serif;background:#fbf7f1;color:var(--ink);line-height:1.7}.hero{padding:52px 22px 24px;text-align:center}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-size:12px}.hero h1{font-size:clamp(32px,5vw,56px);margin:.1em 0}.hero p{color:var(--muted);font-size:17px}.wrap{max-width:980px;margin:0 auto;padding:20px}.report-section,.archive-section{background:rgba(255,250,244,.96);border:1px solid var(--line);border-radius:24px;box-shadow:0 14px 40px rgba(80,55,35,.06);padding:30px;margin-top:18px}.section-title{font-size:clamp(24px,3vw,36px);margin:0 0 18px}.article-list{margin:0;padding-left:24px}.article-row{padding:18px 0;border-bottom:1px solid var(--line)}.article-row:last-child{border-bottom:0}.meta{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin-bottom:5px}.brand{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.06em}.title{font-size:18px;font-weight:700;color:var(--ink);text-decoration:none}.title:hover{color:var(--accent);text-decoration:underline}.summary{color:var(--muted);font-size:14px;margin:8px 0 0}.muted{color:var(--muted)}.archive-list{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.archive-list a{background:#efe4d8;border-radius:999px;padding:7px 12px;color:var(--accent);text-decoration:none}@media(max-width:760px){.report-section,.archive-section{padding:20px}.article-list{padding-left:18px}}'
    page=f'<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{CONFIG["page_title"]}</title><style>{css}</style></head><body><header class="hero"><div class="eyebrow">Luxury Article Search</div><h1>{CONFIG["page_title"]}</h1><p>{CONFIG["page_subtitle"]}</p><p>{date}</p></header><main class="wrap"><section class="report-section"><h2 class="section-title">{date} 前五大精品品牌文章列表</h2>{article_list_html(articles)}</section><section class="archive-section"><h2 class="section-title">歷史搜尋</h2><p class="muted">以下為之前產出的搜尋紀錄。</p><div class="archive-list">{archive_links}</div></section></main></body></html>'
    (DOCS/'index.html').write_text(page, encoding='utf-8')
    (ARCH/archive_name).write_text(page, encoding='utf-8')
    (DOCS/'reports.json').write_text(json.dumps([{'date':n.replace('.html',''),'url':f'archive/{n}'} for n in unique], ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--json', action='store_true'); parser.parse_args()
    for d in [DATA,REPORTS,DOCS,ARCH]: d.mkdir(parents=True, exist_ok=True)
    articles=fetch_articles(); date=now().strftime('%Y-%m-%d')
    (DATA/f'top5_luxury_articles_{date}.json').write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding='utf-8')
    Path('latest_top5_luxury_articles.json').write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding='utf-8')
    md=build_markdown(articles); (REPORTS/f'top5_luxury_articles_{date}.md').write_text(md, encoding='utf-8')
    render_site(articles)
    print(f'[OK] 已產出 reports/top5_luxury_articles_{date}.md、latest_top5_luxury_articles.json 與 docs/index.html', flush=True)
if __name__=='__main__': main()
