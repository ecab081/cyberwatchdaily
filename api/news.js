const SOURCES = [
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com/',
    isArticle: (url) => /^https:\/\/thehackernews\.com\/\d{4}\/\d{2}\/.+\.html(?:\?.*)?$/.test(url),
  },
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/news/security/',
    isArticle: (url) => /^https:\/\/www\.bleepingcomputer\.com\/news\/security\/.+\/$/.test(url),
  },
  {
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com/',
    isArticle: (url) => /^https:\/\/krebsonsecurity\.com\/\d{4}\/\d{2}\/.+\/$/.test(url),
  },
];

const BLOCKLIST = [
  'webinar',
  'whitepaper',
  'ebook',
  'training bundle',
  'deals',
  'podcast',
  'jobs',
  'awards',
  'advertise',
  'newsletter',
  'subscribe',
  'privacy policy',
  'contact us',
  'master',
  'report',
];

function decodeHtml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#038;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function stripTags(text = '') {
  return decodeHtml(text.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function isGoodTitle(title) {
  if (!title) return false;
  const t = title.trim();
  if (t.length < 18 || t.length > 180) return false;
  const lower = t.toLowerCase();
  return !BLOCKLIST.some((word) => lower.includes(word));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberWatchDaily/1.0; +https://cyberwatchdaily.net)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText}`);
    }

    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractAnchors(html, baseUrl, source) {
  const results = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRegex)) {
    const href = normalizeUrl(match[2], baseUrl);
    const title = stripTags(match[3]);

    if (!href || !source.isArticle(href) || !isGoodTitle(title)) continue;
    if (seen.has(href)) continue;

    seen.add(href);
    results.push({ title, url: href, source: source.name });
  }

  return results;
}

function extractMeta(html, names) {
  for (const name of names) {
    const regex = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    );
    const match = html.match(regex);
    if (match?.[1]) return stripTags(match[1]);
  }
  return '';
}

function extractArticleData(html, fallbackTitle) {
  const title =
    extractMeta(html, ['og:title', 'twitter:title']) ||
    stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '') ||
    fallbackTitle;

  const summary =
    extractMeta(html, ['description', 'og:description', 'twitter:description']) ||
    fallbackTitle;

  return {
    title: title.replace(/\s*[\-|–|—]\s*(The Hacker News|BleepingComputer|Krebs on Security).*$/i, '').trim(),
    summary: summary.trim(),
  };
}

function classifyArticle(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();

  const hasAny = (...terms) => terms.some((term) => text.includes(term));

  let category = 'Threat Intel';
  let threatLevel = 3;

  if (hasAny('zero-day', '0-day', 'actively exploited', 'in the wild')) {
    category = 'Zero-Day';
    threatLevel = 5;
  } else if (hasAny('ransomware', 'extortion')) {
    category = 'Ransomware';
    threatLevel = 4;
  } else if (hasAny('data breach', 'breach', 'leak', 'stolen data', 'exposed data')) {
    category = 'Data Breach';
    threatLevel = 4;
  } else if (hasAny('cve-', 'vulnerability', 'patch', 'patched', 'security flaw')) {
    category = 'Vulnerability';
    threatLevel = hasAny('critical', 'cvss 9', 'actively exploited') ? 4 : 3;
  } else if (hasAny('phishing', 'malware', 'trojan', 'botnet', 'backdoor', 'supply chain')) {
    category = 'Malware';
    threatLevel = 4;
  }

  if (hasAny('critical', 'mass exploitation', 'under active exploitation')) {
    threatLevel = Math.max(threatLevel, 4);
  }

  return { category, threat_level: threatLevel };
}

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function getSourceArticles(source) {
  try {
    const html = await fetchText(source.url);
    return extractAnchors(html, source.url, source).slice(0, 4);
  } catch (error) {
    console.error(`Failed to fetch ${source.name}:`, error.message);
    return [];
  }
}

async function enrichArticle(article) {
  try {
    const html = await fetchText(article.url);
    const data = extractArticleData(html, article.title);
    const summary = data.summary.length > 240 ? `${data.summary.slice(0, 237).trim()}...` : data.summary;

    return {
      title: data.title,
      summary,
      url: article.url,
      source: article.source,
      ...classifyArticle(data.title, summary),
    };
  } catch (error) {
    console.error(`Failed to enrich ${article.url}:`, error.message);
    return {
      title: article.title,
      summary: `Latest report from ${article.source}. Open the story for details.`,
      url: article.url,
      source: article.source,
      ...classifyArticle(article.title, article.title),
    };
  }
}

function fallbackArticles() {
  const now = new Date().toISOString();
  return [
    {
      title: 'Feed temporarily unavailable — check back shortly',
      summary: 'CyberWatch Daily could not reach the upstream sources just now. The homepage is working, but the live feed needs another refresh.',
      url: 'https://cyberwatchdaily.net',
      source: 'CyberWatch Daily',
      category: 'Info',
      threat_level: 1,
      published_at: now,
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawGroups = await Promise.all(SOURCES.map(getSourceArticles));
    const rawArticles = uniqueByUrl(rawGroups.flat()).slice(0, 10);

    const enriched = await Promise.all(rawArticles.map(enrichArticle));
    const articles = uniqueByUrl(enriched)
      .filter((article) => article.title && article.summary && article.url)
      .slice(0, 10);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({ articles: articles.length ? articles : fallbackArticles() });
  } catch (error) {
    console.error('News API failure:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ articles: fallbackArticles() });
  }
}
