/**
 * snapshot-news.js — writes a static copy of today's news feed into index.html
 *
 * Why: the homepage feed is rendered client-side by main.js after calling
 * /api/news. Crawlers and the AdSense reviewer that don't run JS (or don't
 * wait for the API) saw an empty shell: "Loading today's threats..." and
 * "—" for every stat. This bakes the current feed into the HTML between the
 * NEWS-SNAPSHOT markers so the page has real content on first byte. main.js
 * still replaces it with the live feed for real visitors.
 *
 * Usage: node scripts/snapshot-news.js   (run daily by news-snapshot.yml)
 */
const fs = require('fs');
const path = require('path');

const API_URL = process.env.NEWS_API_URL || 'https://cyberwatchdaily.net/api/news';
const INDEX = path.join(process.cwd(), 'index.html');
const MAX_CARDS = 15;
const MIN_ARTICLES = 5; // below this, assume the API fell back and keep yesterday's snapshot

const START = '<!-- NEWS-SNAPSHOT:START -->';
const END = '<!-- NEWS-SNAPSHOT:END -->';

const THREAT_LEVELS = {
  5: { label: 'Critical', badgeClass: 'badge-critical', dots: ['#cc2222','#cc2222','#cc2222','#cc2222','#cc2222'] },
  4: { label: 'High',     badgeClass: 'badge-high',     dots: ['#cc4422','#cc4422','#cc4422','#cc4422','#222'] },
  3: { label: 'Medium',   badgeClass: 'badge-medium',   dots: ['#cc8800','#cc8800','#cc8800','#222','#222'] },
  2: { label: 'Low',      badgeClass: 'badge-low',      dots: ['#446622','#446622','#222','#222','#222'] },
  1: { label: 'Info',     badgeClass: 'badge-info',     dots: ['#0066cc','#222','#222','#222','#222'] },
};

const DOMAIN_BADGES = {
  crypto: '<span class="badge badge-domain-crypto">Crypto</span>',
  quantum: '<span class="badge badge-domain-quantum">Quantum</span>',
  ai: '<span class="badge badge-domain-ai">AI</span>',
  nationstate: '<span class="badge badge-domain-nationstate">Nation-State</span>',
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeUrl(u) {
  return /^https?:\/\//i.test(u || '') ? u : '#';
}

function card(a) {
  const tl = THREAT_LEVELS[a.threat_level] || THREAT_LEVELS[1];
  const dots = tl.dots.map(c => `<div class="tdot" style="background:${c};"></div>`).join('');
  const url = esc(safeUrl(a.url));
  const summary = (a.summary || '').trim();
  const showSummary = summary.length >= 20 && summary.toLowerCase() !== (a.title || '').toLowerCase();
  return `      <article class="news-card">
        <div class="card-meta">
          <span class="badge ${tl.badgeClass}">${tl.label}</span>
          <span class="badge badge-cat">${esc(a.category || 'General')}</span>
          ${DOMAIN_BADGES[a.domain] || ''}
          <span class="source-tag">${esc(a.source || 'Unknown source')}</span>
        </div>
        <h3 class="card-title"><a href="${url}" target="_blank" rel="noopener">${esc(a.title)}</a></h3>
        ${showSummary ? `<p class="card-summary">${esc(summary)}</p>` : ''}
        <div class="card-footer">
          <div class="threat-dots">${dots}</div>
          <a class="read-more" href="${url}" target="_blank" rel="noopener">Read full story →</a>
        </div>
      </article>`;
}

async function main() {
  const res = await fetch(API_URL, { headers: { 'User-Agent': 'CyberWatchSnapshot/1.0' } });
  if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
  const data = await res.json();
  const articles = (data.articles || []).filter(a => a && a.title && a.url);

  if (articles.length < MIN_ARTICLES) {
    console.log(`Only ${articles.length} article(s) returned (API fallback?) — keeping existing snapshot.`);
    return;
  }

  const top = [...articles]
    .sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0))
    .slice(0, MAX_CARDS);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  });

  const block = `${START}
    <div class="news-grid" data-snapshot="1">
      <h2 class="snapshot-heading">Top cybersecurity stories — ${esc(today)}</h2>
${top.map(card).join('\n')}
    </div>
    ${END}`;

  let html = fs.readFileSync(INDEX, 'utf8');
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (!re.test(html)) throw new Error('NEWS-SNAPSHOT markers not found in index.html');
  html = html.replace(re, block);

  // Static stats so the stats bar isn't four dashes for crawlers
  const stats = {
    'stat-total': articles.length,
    'stat-critical': articles.filter(a => a.threat_level >= 4).length,
    'stat-breaches': articles.filter(a => ['Data Breach', 'Ransomware'].includes(a.category)).length,
    'stat-vulns': articles.filter(a => ['Vulnerability', 'Zero-Day'].includes(a.category)).length,
  };
  for (const [id, n] of Object.entries(stats)) {
    html = html.replace(new RegExp(`(id="${id}">)[^<]*(<)`), `$1${n}$2`);
  }
  html = html.replace(/(id="last-updated">)[^<]*(<)/, `$1// Snapshot · ${esc(today)}$2`);

  fs.writeFileSync(INDEX, html);
  console.log(`Snapshot written: ${top.length} cards, ${articles.length} total stories (${today}).`);
}

main().catch(err => {
  console.error('Snapshot failed:', err.message);
  process.exit(1);
});
