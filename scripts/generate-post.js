const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Blog post topics that rotate - AI picks the most relevant/trending one
const TOPIC_PROMPTS = [
  "Write about a practical how-to guide for everyday internet users to improve their security",
  "Write an explainer about a current cybersecurity threat or attack technique",
  "Write a comparison/review of popular security tools people should use",
  "Write a beginner's guide to an important cybersecurity concept",
  "Write about how to protect yourself from a specific type of cyber attack",
  "Write about recent data breaches and what people should do to protect themselves"
];

function getTodayTopic() {
  const day = new Date().getDay();
  return TOPIC_PROMPTS[day % TOPIC_PROMPTS.length];
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 60);
}

function getReadTime(content) {
  const words = content.split(' ').length;
  return Math.max(3, Math.ceil(words / 200));
}

async function generatePost() {
  console.log('Generating blog post...');

  const topicPrompt = getTodayTopic();
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `${topicPrompt}. Search the web first for current/relevant information if needed.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "title": "Compelling SEO-friendly blog post title (60 chars max)",
  "category": "How-To Guide|Threat Analysis|Tool Review|Beginner Guide|News Explainer",
  "excerpt": "2-3 sentence compelling summary that makes people want to read more",
  "content": "Full HTML blog post content. Use <h2> for sections, <p> for paragraphs, <ul>/<li> for lists, <strong> for emphasis. Write 600-900 words. Include practical actionable advice. Naturally mention NordVPN or Bitwarden where relevant with affiliate links: NordVPN=https://nordvpn.com and Bitwarden=https://bitwarden.com. Do not include <html>, <head>, <body> or outer structure tags.",
  "seo_description": "Meta description 150-160 chars for SEO"
}
Return ONLY the JSON object.`
      }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`API error: ${data.error.message}`);

  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response');

  return JSON.parse(match[0]);
}

function buildPostHTML(post, slug, dateStr) {
  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${post.title} — CyberWatch Daily</title>
<meta name="description" content="${post.seo_description}">
<link rel="canonical" href="https://cyberwatchdaily.net/blog/${slug}.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<!-- Open Graph -->
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.excerpt}">
<meta property="og:url" content="https://cyberwatchdaily.net/blog/${slug}.html">
<meta property="og:type" content="article">
<style>
  :root {
    --bg:#080c0f;--bg2:#0d1317;--bg3:#121920;--surface:#161e26;--surface2:#1c2730;
    --border:rgba(0,255,136,0.12);--border2:rgba(0,255,136,0.25);
    --green:#00ff88;--green-dark:#003d1f;--text:#e0edd6;--text2:#7a9e8a;--text3:#3d5a47;
    --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.7;}
  a{color:var(--green);text-decoration:none;}
  a:hover{text-decoration:underline;}
  header{border-bottom:1px solid var(--border);padding:0 2rem;position:sticky;top:0;background:rgba(8,12,15,0.97);backdrop-filter:blur(12px);z-index:100;}
  .header-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;}
  .logo{font-family:var(--mono);font-size:17px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:8px;}
  .live-dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 2s infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
  nav{display:flex;gap:1.5rem;font-family:var(--mono);font-size:12px;}
  nav a{color:var(--text2);}
  nav a:hover{color:var(--green);text-decoration:none;}

  .article-layout{max-width:1100px;margin:0 auto;padding:2rem;display:grid;grid-template-columns:1fr 280px;gap:2.5rem;}

  /* Article styles */
  .article-header{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid var(--border);}
  .article-meta{display:flex;gap:10px;align-items:center;margin-bottom:1rem;flex-wrap:wrap;}
  .category-badge{font-family:var(--mono);font-size:10px;padding:3px 10px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);text-transform:uppercase;}
  .article-date{font-family:var(--mono);font-size:11px;color:var(--text3);}
  .read-time{font-family:var(--mono);font-size:11px;color:var(--text3);}
  h1{font-family:var(--mono);font-size:clamp(20px,3vw,30px);font-weight:600;line-height:1.3;margin-bottom:1rem;}
  .article-excerpt{font-size:16px;color:var(--text2);line-height:1.7;padding:1rem 1.25rem;background:var(--bg2);border-left:3px solid var(--green);}

  /* Content styles */
  .article-content h2{font-family:var(--mono);font-size:18px;font-weight:500;color:var(--text);margin:2rem 0 1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border);}
  .article-content p{color:var(--text2);margin-bottom:1.25rem;line-height:1.8;font-size:15px;}
  .article-content ul,.article-content ol{color:var(--text2);padding-left:1.5rem;margin-bottom:1.25rem;font-size:15px;}
  .article-content li{margin-bottom:0.5rem;line-height:1.7;}
  .article-content strong{color:var(--text);font-weight:500;}
  .article-content a{color:var(--green);}
  .article-content blockquote{border-left:3px solid var(--green);padding:0.75rem 1.25rem;background:var(--bg2);margin:1.5rem 0;color:var(--text2);font-style:italic;}

  /* CTA box */
  .affiliate-cta{background:var(--bg2);border:1px solid var(--border2);padding:1.25rem;margin:2rem 0;}
  .affiliate-cta p{color:var(--text2);font-size:14px;margin-bottom:0.75rem;}
  .cta-btn{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:600;padding:8px 18px;background:var(--green);color:#000;margin-right:8px;margin-bottom:4px;transition:background 0.15s;}
  .cta-btn:hover{background:#fff;text-decoration:none;}

  /* Sidebar */
  .sidebar{display:flex;flex-direction:column;gap:1.5rem;}
  .sidebar-card{background:var(--surface);border:1px solid var(--border);padding:1.25rem;}
  .sidebar-title{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text3);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;}
  .sidebar-title::before{content:'//';color:var(--green);}
  .tool-link{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;}
  .tool-link:last-child{border-bottom:none;padding-bottom:0;}
  .tool-badge{font-family:var(--mono);font-size:10px;padding:2px 6px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);}
  .newsletter-btn{width:100%;background:var(--green);color:#000;font-family:var(--mono);font-size:12px;font-weight:600;padding:10px;border:none;cursor:pointer;transition:background 0.15s;}
  .newsletter-btn:hover{background:#fff;}

  /* Back to blog */
  .back-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;color:var(--text3);margin-bottom:1.5rem;}
  .back-link:hover{color:var(--green);text-decoration:none;}

  footer{border-top:1px solid var(--border);padding:1.5rem 2rem;margin-top:2rem;}
  .footer-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;}
  .footer-logo{font-family:var(--mono);font-size:14px;color:var(--green);}
  .footer-links{display:flex;gap:1rem;font-family:var(--mono);font-size:11px;}
  .footer-links a{color:var(--text3);}
  .footer-copy{font-family:var(--mono);font-size:11px;color:var(--text3);}

  @media(max-width:768px){.article-layout{grid-template-columns:1fr;}nav{display:none;}.sidebar{display:none;}}
</style>
</head>
<body>

<header>
  <div class="header-inner">
    <a href="/" class="logo"><div class="live-dot"></div>[CyberWatch Daily]</a>
    <nav>
      <a href="/">News</a>
      <a href="/blog/">Blog</a>
      <a href="/#newsletter">Newsletter</a>
      <a href="/#about">About</a>
    </nav>
  </div>
</header>

<div class="article-layout">
  <article>
    <a href="/blog/" class="back-link">← Back to Blog</a>

    <div class="article-header">
      <div class="article-meta">
        <span class="category-badge">${post.category}</span>
        <span class="article-date">${formattedDate}</span>
        <span class="read-time">${readTime} min read</span>
      </div>
      <h1>${post.title}</h1>
      <div class="article-excerpt">${post.excerpt}</div>
    </div>

    <div class="article-content">
      ${post.content}
    </div>

    <div class="affiliate-cta">
      <p><strong>Stay protected</strong> — the tools our security experts recommend:</p>
      <a href="https://nordvpn.com" target="_blank" rel="noopener" class="cta-btn">Get NordVPN — 70% Off</a>
      <a href="https://bitwarden.com" target="_blank" rel="noopener" class="cta-btn">Try Bitwarden Free</a>
    </div>
  </article>

  <aside class="sidebar">
    <div class="sidebar-card">
      <div class="sidebar-title">Daily Newsletter</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:1rem;line-height:1.6;">Get daily threat intelligence in your inbox. Free.</p>
      <button class="newsletter-btn" onclick="window.open('https://cyberwatchdaily.beehiiv.com/subscribe','_blank')">Subscribe Free →</button>
    </div>

    <div class="sidebar-card">
      <div class="sidebar-title">Recommended Tools</div>
      <div class="tool-link">
        <div><div style="color:var(--text);font-weight:500;font-size:13px;">NordVPN</div><div style="font-size:11px;color:var(--text3);">Best-in-class VPN</div></div>
        <a href="https://nordvpn.com" target="_blank" class="tool-badge">70% Off</a>
      </div>
      <div class="tool-link">
        <div><div style="color:var(--text);font-weight:500;font-size:13px;">Bitwarden</div><div style="font-size:11px;color:var(--text3);">Password manager</div></div>
        <a href="https://bitwarden.com" target="_blank" class="tool-badge">Free</a>
      </div>
    </div>

    <div class="sidebar-card">
      <div class="sidebar-title">More Articles</div>
      <a href="/blog/" style="font-family:var(--mono);font-size:12px;color:var(--text2);">← View all articles</a>
    </div>
  </aside>
</div>

<footer>
  <div class="footer-inner">
    <div class="footer-logo">[CyberWatch Daily]</div>
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/blog/">Blog</a>
      <a href="/#about">About</a>
      <a href="/privacy-policy.html">Privacy Policy</a>
    </div>
    <div class="footer-copy">© 2026 CyberWatch Daily · cyberwatchdaily.net</div>
  </div>
</footer>

</body>
</html>`;
}

function updateBlogIndex(post, slug, dateStr) {
  const indexPath = path.join(__dirname, '../blog/index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');

  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const newPostCard = `<a href="/blog/${slug}.html" class="post-card">
        <div class="post-meta">
          <span class="post-category">${post.category}</span>
          <span class="post-date">${formattedDate}</span>
        </div>
        <div class="post-title">${post.title}</div>
        <div class="post-excerpt">${post.excerpt}</div>
        <div class="post-footer">
          <span class="read-time">${readTime} min read</span>
          <span class="read-more">Read article →</span>
        </div>
      </a>`;

  // Remove empty state if present, insert new post
  if (indexContent.includes('<!-- POSTS_PLACEHOLDER -->')) {
    indexContent = indexContent.replace(
      /<!-- POSTS_PLACEHOLDER -->[\s\S]*?<\/div>\s*<\/div>/,
      `<!-- POSTS_PLACEHOLDER -->\n      ${newPostCard}\n    </div>`
    );
  } else {
    indexContent = indexContent.replace(
      '<!-- POSTS_PLACEHOLDER -->',
      `<!-- POSTS_PLACEHOLDER -->\n      ${newPostCard}`
    );
  }

  // If empty state is still there, replace it
  indexContent = indexContent.replace(
    /\s*<div class="empty-state">[\s\S]*?<\/div>/,
    ''
  );

  // Prepend new post before first existing post card
  if (!indexContent.includes('<!-- POSTS_PLACEHOLDER -->')) {
    indexContent = indexContent.replace(
      '<div class="posts-grid" id="posts-grid">',
      `<div class="posts-grid" id="posts-grid">\n      ${newPostCard}`
    );
  }

  fs.writeFileSync(indexPath, indexContent);
  console.log('Blog index updated');
}

async function main() {
  try {
    console.log('CyberWatch Daily Blog Post Generator Starting...');

    const post = await generatePost();
    console.log(`Generated post: "${post.title}"`);

    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(post.title) + '-' + today;

    // Write the blog post HTML
    const postHTML = buildPostHTML(post, slug, today);
    const postPath = path.join(__dirname, '../blog', `${slug}.html`);
    fs.writeFileSync(postPath, postHTML);
    console.log(`Post saved: blog/${slug}.html`);

    // Update blog index
    updateBlogIndex(post, slug, today);

    // Update sitemap
    const sitemapPath = path.join(__dirname, '../sitemap.xml');
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const newUrl = `  <url>
    <loc>https://cyberwatchdaily.net/blog/${slug}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.7</priority>
  </url>`;
    sitemap = sitemap.replace('</urlset>', `${newUrl}\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap);
    console.log('Sitemap updated');

    console.log('Done! Post published successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
