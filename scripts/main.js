
// Auto-load news on page open, with 24hr cache
const CACHE_KEY = 'cyberwatch_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

function loadCachedOrFetch() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { articles, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age < CACHE_DURATION && articles && articles.length > 0) {
        allArticles = articles;
        activeFilter = 'All';
        renderFeed();
        document.getElementById('stat-total').textContent = allArticles.length;
        document.getElementById('stat-critical').textContent = allArticles.filter(a => a.threat_level >= 4).length;
        document.getElementById('stat-breaches').textContent = allArticles.filter(a => ['Data Breach','Ransomware'].includes(a.category)).length;
        document.getElementById('stat-vulns').textContent = allArticles.filter(a => ['Vulnerability','Zero-Day'].includes(a.category)).length;
        document.getElementById('last-updated').textContent = '// Cached · ' + new Date(timestamp).toLocaleTimeString();
        document.getElementById('scan-btn').textContent = '⚡ Refresh Feed';
        return;
      }
    }
  } catch(e) {}
  // No valid cache — auto fetch
  fetchNews();
}

// Save to cache after successful fetch
function saveToCache(articles) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ articles, timestamp: Date.now() }));
  } catch(e) {}
}


let allArticles = [];
let activeFilter = 'All';

const THREAT_LEVELS = {
  5: { label: 'Critical', badgeClass: 'badge-critical', dots: ['#cc2222','#cc2222','#cc2222','#cc2222','#cc2222'] },
  4: { label: 'High',     badgeClass: 'badge-high',     dots: ['#cc4422','#cc4422','#cc4422','#cc4422','#222'] },
  3: { label: 'Medium',   badgeClass: 'badge-medium',   dots: ['#cc8800','#cc8800','#cc8800','#222','#222'] },
  2: { label: 'Low',      badgeClass: 'badge-low',       dots: ['#446622','#446622','#222','#222','#222'] },
  1: { label: 'Info',     badgeClass: 'badge-info',      dots: ['#0066cc','#222','#222','#222','#222'] },
};

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
    const resp = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    allArticles = data.articles;
    saveToCache(allArticles);
    activeFilter = 'All';
    renderFeed();

    // Update stats
    document.getElementById('stat-total').textContent = allArticles.length;
    document.getElementById('stat-critical').textContent = allArticles.filter(a => a.threat_level >= 4).length;
    document.getElementById('stat-breaches').textContent = allArticles.filter(a => ['Data Breach','Ransomware'].includes(a.category)).length;
    document.getElementById('stat-vulns').textContent = allArticles.filter(a => ['Vulnerability','Zero-Day'].includes(a.category)).length;
    document.getElementById('last-updated').textContent = '// Updated ' + new Date().toLocaleTimeString();

  } catch (err) {
    document.getElementById('feed').innerHTML = `
      <div class="empty-state">
        <div class="empty-title" style="color:var(--red);">// ERROR: ${err.message}</div>
        <div class="empty-sub" style="margin-top:0.5rem;">Please try again in a moment.</div>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = '↻ Refresh';
}


function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFeed() {
  const articles = activeFilter === 'All' ? allArticles : allArticles.filter(a => a.category === activeFilter);

  // Build filters
  const cats = ['All', ...new Set(allArticles.map(a => a.category))];
  const filterRow = document.getElementById('filters');
  filterRow.style.display = 'flex';
  filterRow.innerHTML = cats.map(c =>
    `<button class="filter-btn ${c === activeFilter ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  filterRow.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.category || 'All'));
  });

  if (articles.length === 0) {
    document.getElementById('feed').innerHTML = `<div class="empty-state"><div class="empty-sub">No stories in this category.</div></div>`;
    return;
  }

  document.getElementById('feed').innerHTML = `<div class="news-grid">${articles.map((a, i) => renderCard(a, i)).join('')}</div>`;
}

function renderCard(a, i) {
  const tl = THREAT_LEVELS[a.threat_level] || THREAT_LEVELS[1];
  const dots = tl.dots.map(c => `<div class="tdot" style="background:${c};"></div>`).join('');
  const title = escapeHtml(a.title || 'Untitled story');
  const summary = escapeHtml(a.summary || 'No summary available.');
  const category = escapeHtml(a.category || 'General');
  const source = escapeHtml(a.source || 'Unknown source');
  const url = a.url || '#';
  return `
  <div class="news-card" style="animation-delay:${i * 0.06}s">
    <div class="card-meta">
      <span class="badge ${tl.badgeClass}">${tl.label}</span>
      <span class="badge badge-cat">${category}</span>
      <span class="source-tag">${source}</span>
    </div>
    <div class="card-title"><a href="${url}" target="_blank" rel="noopener">${title}</a></div>
    <div class="card-summary">${summary}</div>
    <div class="card-footer">
      <div class="threat-dots">${dots}</div>
      <a class="read-more" href="${url}" target="_blank" rel="noopener">Read full story →</a>
    </div>
  </div>`;
}

function setFilter(category) {
  activeFilter = category;
  renderFeed();
}

function subscribe() {
  window.open('https://cyberwatchdaily.beehiiv.com/subscribe', '_blank', 'noopener');
}


function init() {
  const headerDate = document.getElementById('header-date');
  if (headerDate) {
    const now = new Date();
    headerDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  const scanBtn = document.getElementById('scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', fetchNews);
  }

  const newsletterBtn = document.getElementById('newsletter-btn');
  if (newsletterBtn) {
    newsletterBtn.addEventListener('click', subscribe);
  }

  const initialFilterButtons = document.querySelectorAll('#filters [data-category]');
  initialFilterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.category || 'All'));
  });

  loadCachedOrFetch();
}

document.addEventListener('DOMContentLoaded', init);
