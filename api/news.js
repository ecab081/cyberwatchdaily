const SOURCES = [
  // ── Cybersecurity News Sites ──────────────────────────────────────
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/thehackernews\.com\/\d{4}\/\d{2}\/.+\.html(?:\?.*)?$/.test(url),
  },
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/news/security/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/www\.bleepingcomputer\.com\/news\/security\/.+\/$/.test(url),
  },
  {
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/krebsonsecurity\.com\/\d{4}\/\d{2}\/.+\/$/.test(url),
  },
  {
    name: 'Dark Reading',
    url: 'https://www.darkreading.com/latest-news',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/www\.darkreading\.com\/[a-z0-9-]+\/[a-z0-9-]+(?:\?.*)?$/i.test(url),
  },
  {
    name: 'Hackread',
    url: 'https://hackread.com/latest/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/hackread\.com\/(?!latest\/$|about-us\/$|our-team\/$|contact-us\/$|privacy-policy\/$|tag\/|category\/|author\/)[^?#]+\/$/i.test(url),
  },

  // ── Cybersecurity Influencer Blogs ────────────────────────────────
  {
    name: 'Troy Hunt',
    url: 'https://www.troyhunt.com/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/www\.troyhunt\.com\/[a-z0-9-]+\/?(?:\?.*)?$/i.test(url) && !/troyhunt\.com\/$/.test(url),
  },
  {
    name: 'Bruce Schneier',
    url: 'https://www.schneier.com/blog/archives/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/www\.schneier\.com\/blog\/archives\/\d{4}\/\d{2}\/.+\.html(?:\?.*)?$/.test(url),
  },
  {
    name: 'Graham Cluley',
    url: 'https://grahamcluley.com/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/grahamcluley\.com\/[a-z0-9-]+\/?(?:\?.*)?$/i.test(url) && !/grahamcluley\.com\/$/.test(url),
  },
  {
    name: 'Daniel Miessler',
    url: 'https://danielmiessler.com/',
    domain: 'cybersecurity',
    isArticle: (url) => /^https:\/\/danielmiessler\.com\/blog\/.+(?:\?.*)?$/i.test(url),
  },

  // ── Crypto Security Sources ───────────────────────────────────────
  {
    name: 'CoinTelegraph',
    url: 'https://cointelegraph.com/tags/security',
    domain: 'crypto',
    isArticle: (url) => /^https:\/\/cointelegraph\.com\/news\/[a-z0-9-]+(?:\?.*)?$/.test(url),
  },
  {
    name: 'The Block',
    url: 'https://www.theblock.co/tag/hacks',
    domain: 'crypto',
    isArticle: (url) => /^https:\/\/www\.theblock\.co\/post\/\d+\/[a-z0-9-]+(?:\?.*)?$/.test(url),
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/news',
    domain: 'crypto',
    isArticle: (url) => /^https:\/\/decrypt\.co\/\d+\/[a-z0-9-]+(?:\?.*)?$/.test(url),
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/tag/security/',
    domain: 'crypto',
    isArticle: (url) => /^https:\/\/www\.coindesk\.com\/[a-z]+\/\d{4}\/\d{2}\/\d{2}\/.+(?:\?.*)?$/i.test(url),
  },
  {
    name: 'Lookonchain',
    url: 'https://lookonchain.com/',
    domain: 'crypto',
    isArticle: (url) => /^https:\/\/lookonchain\.com\/post\/.+(?:\?.*)?$/i.test(url),
  },

  // ── Quantum Computing Sources ─────────────────────────────────────
  {
    name: 'The Quantum Insider',
    url: 'https://thequantuminsider.com/',
    domain: 'quantum',
    isArticle: (url) => /^https:\/\/thequantuminsider\.com\/\d{4}\/\d{2}\/\d{2}\/.+\/?(?:\?.*)?$/i.test(url),
  },
  {
    name: 'Scott Aaronson (Shtetl-Optimized)',
    url: 'https://scottaaronson.blog/',
    domain: 'quantum',
    isArticle: (url) => /^https:\/\/scottaaronson\.blog\/\?p=\d+(?:&.*)?$/i.test(url),
  },
  {
    name: 'IBM Research Blog',
    url: 'https://research.ibm.com/blog',
    domain: 'quantum',
    isArticle: (url) => /^https:\/\/research\.ibm\.com\/blog\/.+(?:\?.*)?$/i.test(url),
  },
  {
    name: 'Quantum Computing Report',
    url: 'https://quantumcomputingreport.com/',
    domain: 'quantum',
    isArticle: (url) => /^https:\/\/quantumcomputingreport\.com\/\d{4}\/\d{2}\/\d{2}\/.+\/?(?:\?.*)?$/i.test(url),
  },
];

// ── Google News RSS feeds for X/social influencers ─────────────────
// These surface news articles mentioning these accounts/experts
// without needing X API access
const RSS_SOURCES = [
  // Cybersecurity X influencers
  {
    name: 'SwiftOnSecurity',
    url: 'https://news.google.com/rss/search?q=%22SwiftOnSecurity%22+cybersecurity&hl=en-US&gl=US&ceid=US:en',
    domain: 'cybersecurity',
  },
  {
    name: 'Mikko Hyppönen',
    url: 'https://news.google.com/rss/search?q=%22Mikko+Hypponen%22+OR+%22mikko%22+cybersecurity+threat&hl=en-US&gl=US&ceid=US:en',
    domain: 'cybersecurity',
  },
  {
    name: 'CISA Alerts',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    domain: 'cybersecurity',
  },
  // Crypto X influencers
  {
    name: 'Andreas Antonopoulos',
    url: 'https://news.google.com/rss/search?q=%22Andreas+Antonopoulos%22+bitcoin+crypto&hl=en-US&gl=US&ceid=US:en',
    domain: 'crypto',
  },
  {
    name: 'Pomp (Anthony Pompliano)',
    url: 'https://news.google.com/rss/search?q=%22Pompliano%22+bitcoin+crypto&hl=en-US&gl=US&ceid=US:en',
    domain: 'crypto',
  },
  {
    name: 'CoinDesk RSS',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    domain: 'crypto',
  },
  // Quantum X influencers
  {
    name: 'Scott Aaronson News',
    url: 'https://news.google.com/rss/search?q=%22Scott+Aaronson%22+quantum+computing&hl=en-US&gl=US&ceid=US:en',
    domain: 'quantum',
  },
  {
    name: 'IBM Quantum News',
    url: 'https://news.google.com/rss/search?q=%22IBM+Quantum%22+OR+%22Google+Quantum%22+computing&hl=en-US&gl=US&ceid=US:en',
    domain: 'quantum',
  },
  {
    name: 'Quantum Threat',
    url: 'https://news.google.com/rss/search?q=quantum+computing+cryptography+security+threat&hl=en-US&gl=US&ceid=US:en',
    domain: 'quantum',
  },
];

const BLOCKLIST = [
  'webinar', 'whitepaper', 'ebook', 'training bundle', 'deals', 'podcast',
  'jobs', 'awards', 'advertise', 'newsletter', 'subscribe', 'privacy policy',
  'contact us', 'master', 'report', 'press release', 'resource library',
  'partner perspectives', 'dark reading confidential',
  'price prediction', 'price today', 'market update', 'trading signals',
];

function decodeHtml(text = '') {
  return text
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#x27;/gi, "'").replace(/&#x2F;/gi, '/')
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"').replace(/&#8230;/g, '...').replace(/&#038;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return Number.isFinite(c) ? String.fromCharCode(c) : _; });
}

function stripTags(text = '') {
  return decodeHtml(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeUrl(href, base) {
  try { return new URL(href, base).toString(); } catch { return null; }
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
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
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
    results.push({ title, url: href, source: source.name, sourceDomain: source.domain });
  }
  return results;
}

// ── RSS Parser ────────────────────────────────────────────────────────
function parseRSS(xml, sourceName, sourceDomain) {
  const results = [];
  const seen = new Set();
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const items = xml.match(itemRegex) || [];
  for (const item of items.slice(0, 6)) {
    // Extract title
    const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = stripTags(titleMatch?.[1] || '').trim();
    // Extract link — try <link> then <guid>
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                      item.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/i);
    let url = stripTags(linkMatch?.[1] || '').trim();
    // Google News wraps URLs — decode if needed
    if (url.includes('news.google.com')) {
      const realUrl = item.match(/url=(https?[^&"<\s]+)/i)?.[1];
      if (realUrl) url = decodeURIComponent(realUrl);
    }
    // Extract description
    const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const summary = stripTags(descMatch?.[1] || '').slice(0, 240).trim();
    if (!title || !url || !isGoodTitle(title)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ title, url, summary, source: sourceName, sourceDomain });
  }
  return results;
}

async function getRSSArticles(source) {
  try {
    const xml = await fetchText(source.url);
    return parseRSS(xml, source.name, source.domain);
  } catch (error) {
    console.error(`RSS fetch failed for ${source.name}:`, error.message);
    return [];
  }
}

function extractMeta(html, names) {
  for (const name of names) {
    const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
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
    title: title.replace(/\s*[\-|–|—]\s*(The Hacker News|BleepingComputer|Krebs on Security|Hackread|Dark Reading|CoinTelegraph|The Block|Decrypt|CoinDesk|Troy Hunt|Bruce Schneier|Graham Cluley).*$/i, '').trim(),
    summary: summary.trim(),
  };
}

function classifyDomain(title, summary, sourceDomain) {
  const text = `${title} ${summary}`.toLowerCase();
  const quantumTerms = ['quantum', 'post-quantum', 'pqc', 'qubit', "shor's algorithm", 'nist pqc',
    'crystals-kyber', 'crystals-dilithium', 'lattice cryptograph', 'quantum computer',
    'quantum threat', 'quantum resistant', 'harvest now decrypt later', 'crqc'];
  if (quantumTerms.some(t => text.includes(t))) return 'quantum';
  if (sourceDomain === 'quantum') return 'quantum';
  if (sourceDomain === 'crypto') return 'crypto';
  const cryptoTerms = ['bitcoin', 'ethereum', 'cryptocurrency', 'crypto exchange', 'defi ', 'nft hack',
    'blockchain hack', 'crypto wallet', 'crypto theft', 'crypto scam', 'rug pull',
    'smart contract exploit', 'binance', 'coinbase hack', 'solana hack', 'crypto heist',
    'web3 exploit', 'crypto fraud', 'ransomware bitcoin', 'crypto ransom'];
  if (cryptoTerms.some(t => text.includes(t))) return 'crypto';
  return 'cybersecurity';
}

function classifyArticle(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const hasAny = (...terms) => terms.some((term) => text.includes(term));
  let category = 'Threat Intel';
  let threatLevel = 3;
  if (hasAny('zero-day', '0-day', 'actively exploited', 'in the wild')) {
    category = 'Zero-Day'; threatLevel = 5;
  } else if (hasAny('ransomware', 'extortion')) {
    category = 'Ransomware'; threatLevel = 4;
  } else if (hasAny('data breach', 'breach', 'leak', 'stolen data', 'exposed data', 'hack', 'heist', 'theft', 'drained')) {
    category = 'Data Breach'; threatLevel = 4;
  } else if (hasAny('cve-', 'vulnerability', 'patch', 'patched', 'security flaw', 'exploit')) {
    category = 'Vulnerability'; threatLevel = hasAny('critical', 'cvss 9', 'actively exploited') ? 4 : 3;
  } else if (hasAny('phishing', 'malware', 'trojan', 'botnet', 'backdoor', 'supply chain', 'scam', 'fraud')) {
    category = 'Malware'; threatLevel = 4;
  } else if (hasAny('regulation', 'sec ', 'cftc', 'law enforcement', 'arrested', 'charged', 'indicted')) {
    category = 'Regulation'; threatLevel = 2;
  } else if (hasAny('quantum', 'post-quantum', 'pqc')) {
    category = 'Quantum'; threatLevel = 3;
  }
  if (hasAny('critical', 'mass exploitation', 'under active exploitation', 'millions', 'billions')) {
    threatLevel = Math.max(threatLevel, 4);
  }
  return { category, threat_level: threatLevel };
}

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => { if (seen.has(item.url)) return false; seen.add(item.url); return true; });
}

async function getSourceArticles(source) {
  try {
    const html = await fetchText(source.url);
    return extractAnchors(html, source.url, source).slice(0, 5);
  } catch (error) {
    console.error(`Failed to fetch ${source.name}:`, error.message);
    return [];
  }
}

async function enrichArticle(article) {
  // RSS articles already have summaries — skip fetching the full page
  if (article.summary && article.summary.length > 60) {
    const domain = classifyDomain(article.title, article.summary, article.sourceDomain);
    return { ...article, domain, ...classifyArticle(article.title, article.summary) };
  }
  try {
    const html = await fetchText(article.url);
    const data = extractArticleData(html, article.title);
    let rawSummary = data.summary.trim();
    if (!rawSummary || rawSummary === data.title || rawSummary.toLowerCase() === data.title.toLowerCase() || rawSummary.length < 30) {
      rawSummary = '';
    }
    const summary = rawSummary.length > 240 ? `${rawSummary.slice(0, 237).trim()}...` : rawSummary;
    const domain = classifyDomain(data.title, summary, article.sourceDomain);
    return { title: data.title, summary, url: article.url, source: article.source, domain, ...classifyArticle(data.title, summary) };
  } catch (error) {
    console.error(`Failed to enrich ${article.url}:`, error.message);
    const domain = classifyDomain(article.title, article.title, article.sourceDomain);
    return {
      title: article.title,
      summary: article.summary || '',
      url: article.url, source: article.source, domain,
      ...classifyArticle(article.title, article.title),
    };
  }
}

function fallbackArticles() {
  return [{
    title: 'Feed temporarily unavailable — check back shortly',
    summary: 'CyberWatch Daily could not reach the upstream sources just now.',
    url: 'https://cyberwatchdaily.net', source: 'CyberWatch Daily',
    category: 'Info', threat_level: 1, domain: 'cybersecurity',
  }];
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Fetch HTML sources and RSS sources in parallel
    const [htmlGroups, rssGroups] = await Promise.all([
      Promise.all(SOURCES.map(getSourceArticles)),
      Promise.all(RSS_SOURCES.map(getRSSArticles)),
    ]);

    const allRaw = uniqueByUrl([
      ...htmlGroups.flat(),
      ...rssGroups.flat(),
    ]).slice(0, 30);

    const enriched = await Promise.all(allRaw.map(enrichArticle));

    const articles = uniqueByUrl(enriched)
      .filter((article) => article.title && article.url)
      .slice(0, 25);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({ articles: articles.length ? articles : fallbackArticles() });
  } catch (error) {
    console.error('News API failure:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ articles: fallbackArticles() });
  }
}
