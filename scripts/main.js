// CyberWatch Daily — main.js
const CACHE_KEY = 'cyberwatch_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

let allArticles = [];
let activeFilter = 'All';
let activeDomain = 'all'; // 'all' | 'cybersecurity' | 'crypto' | 'quantum'

// ── Domain classifier ─────────────────────────────────────────────────────
function classifyDomain(title, summary) {
  const t = ((title || '') + ' ' + (summary || '')).toLowerCase();
  const quantum = ['quantum','post-quantum','pqc','qubit','shor','nist pqc',
    'crystals-kyber','crystals-dilithium','lattice crypto','quantum computer',
    'quantum threat','quantum resistant','crqc','harvest now decrypt'];
  if (quantum.some(k => t.includes(k))) return 'quantum';
  const crypto = ['bitcoin','ethereum','cryptocurrency','crypto exchange','defi ',
    'nft hack','blockchain hack','crypto wallet','crypto theft','crypto scam',
    'rug pull','smart contract exploit','binance','coinbase hack','solana hack',
    'crypto heist','web3 exploit','crypto fraud','crypto ransom','cointelegraph'];
  if (crypto.some(k => t.includes(k))) return 'crypto';
  return 'cybersecurity';
}

function enrichWithDomain(articles) {
  return articles.map(a => ({
    ...a,
    domain: a.domain || classifyDomain(a.title, a.summary)
  }));
}

// ── Cache ─────────────────────────────────────────────────────────────────
function loadCachedOrFetch() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { articles, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION && articles?.length) {
        allArticles = enrichWithDomain(articles);
        renderFeed();
        updateStats();
        document.getElementById('last-updated').textContent =
          '// Cached · ' + new Date(timestamp).toLocaleTimeString();
        document.getElementById('scan-btn').textContent = '⚡ Refresh Feed';
        return;
      }
    }
  } catch(e) {}
  fetchNews();
}

function saveToCache(articles) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ articles, timestamp: Date.now() }));
  } catch(e) {}
}

// ── Fetch ─────────────────────────────────────────────────────────────────
async function fetchNews() {
  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  btn.textContent = '⚡ Scanning...';

  document.getElementById('feed').innerHTML = `
    <div class="loading-state">
      <div class="loading-text">// SCANNING THREAT INTELLIGENCE FEEDS...</div>
      <div class="loading-bar"></div>
    </div>`;
  document.getElementById('filters').style.display = 'none';

  try {
    const resp = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    allArticles = enrichWithDomain(data.articles);
    saveToCache(data.articles); // save raw; enrich on load
    activeFilter = 'All';
    renderFeed();
    updateStats();
    document.getElementById('last-updated').textContent =
      '// Updated ' + new Date().toLocaleTimeString();
  } catch(err) {
    document.getElementById('feed').innerHTML = `
      <div class="empty-state">
        <div class="empty-title" style="color:var(--red);">// ERROR: ${err.message}</div>
        <div class="empty-sub" style="margin-top:0.5rem;">Please try again in a moment.</div>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = '↻ Refresh';
}

function updateStats() {
  document.getElementById('stat-total').textContent = allArticles.length;
  document.getElementById('stat-critical').textContent =
    allArticles.filter(a => a.threat_level >= 4).length;
  document.getElementById('stat-breaches').textContent =
    allArticles.filter(a => ['Data Breach','Ransomware'].includes(a.category)).length;
  document.getElementById('stat-vulns').textContent =
    allArticles.filter(a => ['Vulnerability','Zero-Day'].includes(a.category)).length;
}

// ── Render ────────────────────────────────────────────────────────────────
const THREAT_LEVELS = {
  5: { label: 'Critical', badgeClass: 'badge-critical', dots: ['#cc2222','#cc2222','#cc2222','#cc2222','#cc2222'] },
  4: { label: 'High',     badgeClass: 'badge-high',     dots: ['#cc4422','#cc4422','#cc4422','#cc4422','#222'] },
  3: { label: 'Medium',   badgeClass: 'badge-medium',   dots: ['#cc8800','#cc8800','#cc8800','#222','#222'] },
  2: { label: 'Low',      badgeClass: 'badge-low',       dots: ['#446622','#446622','#222','#222','#222'] },
  1: { label: 'Info',     badgeClass: 'badge-info',      dots: ['#0066cc','#222','#222','#222','#222'] },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function getDomainBadge(domain) {
  if (domain === 'crypto')  return `<span class="badge badge-domain-crypto">Crypto</span>`;
  if (domain === 'quantum') return `<span class="badge badge-domain-quantum">Quantum</span>`;
  return '';
}

function renderCard(a, i) {
  const tl = THREAT_LEVELS[a.threat_level] || THREAT_LEVELS[1];
  const dots = tl.dots.map(c => `<div class="tdot" style="background:${c};"></div>`).join('');
  const title = escapeHtml(a.title || 'Untitled story');
  const category = escapeHtml(a.category || 'General');
  const source = escapeHtml(a.source || 'Unknown source');
  const url = a.url || '#';

  // Only show summary if it's genuinely different from the title
  const rawSum = (a.summary || '').trim();
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const nSum = norm(rawSum);
  const nTitle = norm(a.title || '');
  const isDupe = !rawSum || rawSum.length < 20 ||
    nSum === nTitle ||
    nSum.startsWith(nTitle.slice(0, Math.min(nTitle.length, 55))) ||
    nTitle.startsWith(nSum.slice(0, Math.min(nSum.length, 55)));
  const summaryHtml = isDupe
    ? ''
    : `<div class="card-summary">${escapeHtml(rawSum)}</div>`;

  return `
  <div class="news-card" style="animation-delay:${i * 0.06}s">
    <div class="card-meta">
      <span class="badge ${tl.badgeClass}">${tl.label}</span>
      <span class="badge badge-cat">${category}</span>
      ${getDomainBadge(a.domain)}
      <span class="source-tag">${source}</span>
    </div>
    <div class="card-title"><a href="${url}" target="_blank" rel="noopener">${title}</a></div>
    ${summaryHtml}
    <div class="card-footer">
      <div class="threat-dots">${dots}</div>
      <a class="read-more" href="${url}" target="_blank" rel="noopener">Read full story →</a>
    </div>
  </div>`;
}

function renderFeed() {
  // Filter by domain first, then by category
  const domainFiltered = activeDomain === 'all'
    ? allArticles
    : allArticles.filter(a => a.domain === activeDomain);

  const articles = activeFilter === 'All'
    ? domainFiltered
    : domainFiltered.filter(a => a.category === activeFilter);

  // Build category filter buttons from domain-filtered set
  const cats = ['All', ...new Set(domainFiltered.map(a => a.category))];
  const filterRow = document.getElementById('filters');
  filterRow.style.display = 'flex';
  filterRow.innerHTML = cats.map(c =>
    `<button class="filter-btn ${c === activeFilter ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');
  filterRow.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.category || 'All'));
  });

  if (!articles.length) {
    document.getElementById('feed').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">[ ]</div>
        <div class="empty-title">No stories found</div>
        <div class="empty-sub">No ${activeDomain === 'all' ? '' : activeDomain + ' '}stories in this category.</div>
      </div>`;
    return;
  }

  document.getElementById('feed').innerHTML =
    `<div class="news-grid">${articles.map((a, i) => renderCard(a, i)).join('')}</div>`;
}

// ── Filters ───────────────────────────────────────────────────────────────
function setFilter(category) {
  activeFilter = category;
  renderFeed();
}

function setDomain(domain) {
  activeDomain = domain;
  activeFilter = 'All'; // reset category filter when switching domain
  // Update domain button styles
  ['all','cybersecurity','crypto','quantum'].forEach(d => {
    const btn = document.getElementById('domain-' + d);
    if (btn) btn.classList.toggle('active', d === domain);
  });
  renderFeed();
}

// ── Init ──────────────────────────────────────────────────────────────────
function subscribe() {
  window.open('https://cyberwatchdaily.beehiiv.com/subscribe', '_blank', 'noopener');
}

function init() {
  const headerDate = document.getElementById('header-date');
  if (headerDate) {
    headerDate.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  const scanBtn = document.getElementById('scan-btn');
  if (scanBtn) scanBtn.addEventListener('click', fetchNews);

  const newsletterBtn = document.getElementById('newsletter-btn');
  if (newsletterBtn) newsletterBtn.addEventListener('click', subscribe);

  // Wire up domain filter buttons via event listeners (not onclick attributes)
  ['all', 'cybersecurity', 'crypto', 'quantum'].forEach(domain => {
    const btn = document.getElementById('domain-' + domain);
    if (btn) btn.addEventListener('click', () => setDomain(domain));
  });

  loadCachedOrFetch();
}

// Expose functions globally so onclick attributes can call them
window.setDomain = setDomain;
window.setFilter = setFilter;
window.subscribe = subscribe;

document.addEventListener('DOMContentLoaded', init);
