const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TOPICS = [
  'Write a practical how-to guide for everyday users to improve their online security',
  'Write an explainer about a current cybersecurity threat or attack technique people should know about',
  'Write a comparison of popular security tools people should use to stay safe online',
  'Write a beginners guide to an important cybersecurity concept everyone should understand',
  'Write about how to protect yourself from a specific type of cyber attack',
  'Write about data breaches and what people should do to protect themselves'
];

function getTopic() {
  return TOPICS[new Date().getDay() % TOPICS.length];
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
  return Math.max(3, Math.ceil(content.split(' ').length / 200));
}

async function generatePost() {
  console.log('Generating blog post...');
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
        content: getTopic() + '. Search the web for current relevant info if needed. Return ONLY a valid JSON object, no markdown, no extra text: {"title":"SEO-friendly title under 60 chars","category":"How-To Guide|Threat Analysis|Tool Review|Beginner Guide|News Explainer","excerpt":"2-3 sentence summary","content":"Full HTML using h2 p ul li strong tags, 600-900 words, mention NordVPN at https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902 or Bitwarden at https://bitwarden.com where relevant","seo_description":"Meta description 150-160 chars"}'
      }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error('API error: ' + data.error.message);
  const text = data.content.filter(function(b) { return b.type === 'text'; }).map(function(b) { return b.text; }).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response');
  return JSON.parse(match[0]);
}

function buildPostHTML(post, slug, dateStr) {
  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + post.title + ' - CyberWatch Daily</title>\n' +
    '<meta name="description" content="' + post.seo_description + '">\n' +
    '<link rel="canonical" href="https://cyberwatchdaily.net/blog/' + slug + '.html">\n' +
    '<meta property="og:title" content="' + post.title + '">\n' +
    '<meta property="og:description" content="' + post.excerpt + '">\n' +
    '<meta property="og:url" content="https://cyberwatchdaily.net/blog/' + slug + '.html">\n' +
    '<meta property="og:type" content="article">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">\n' +
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6298202092368819" crossorigin="anonymous"></script>\n' +
    '<style>\n' +
    ':root{--bg:#080c0f;--bg2:#0d1317;--bg3:#121920;--surface:#161e26;--surface2:#1c2730;--border:rgba(0,255,136,0.12);--border2:rgba(0,255,136,0.25);--green:#00ff88;--green-dark:#003d1f;--text:#e0edd6;--text2:#7a9e8a;--text3:#3d5a47;--mono:"IBM Plex Mono",monospace;--sans:"IBM Plex Sans",sans-serif;}\n' +
    '*{box-sizing:border-box;margin:0;padding:0;}\n' +
    'body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.7;}\n' +
    'a{color:var(--green);text-decoration:none;}a:hover{text-decoration:underline;}\n' +
    'header{border-bottom:1px solid var(--border);padding:0 2rem;position:sticky;top:0;background:rgba(8,12,15,0.97);backdrop-filter:blur(12px);z-index:100;}\n' +
    '.header-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;}\n' +
    '.logo{font-family:var(--mono);font-size:17px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:8px;}\n' +
    '.live-dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 2s infinite;}\n' +
    '@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}\n' +
    'nav{display:flex;gap:1.5rem;font-family:var(--mono);font-size:12px;}nav a{color:var(--text2);}nav a:hover{color:var(--green);text-decoration:none;}\n' +
    '.layout{max-width:1100px;margin:0 auto;padding:2rem;display:grid;grid-template-columns:1fr 280px;gap:2.5rem;}\n' +
    '.back{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;color:var(--text3);margin-bottom:1.5rem;}\n' +
    '.back:hover{color:var(--green);text-decoration:none;}\n' +
    '.article-header{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid var(--border);}\n' +
    '.meta{display:flex;gap:10px;align-items:center;margin-bottom:1rem;flex-wrap:wrap;}\n' +
    '.cat{font-family:var(--mono);font-size:10px;padding:3px 10px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);text-transform:uppercase;}\n' +
    '.date{font-family:var(--mono);font-size:11px;color:var(--text3);}\n' +
    '.rt{font-family:var(--mono);font-size:11px;color:var(--text3);}\n' +
    'h1{font-family:var(--mono);font-size:clamp(20px,3vw,28px);font-weight:600;line-height:1.3;margin-bottom:1rem;}\n' +
    '.excerpt{font-size:16px;color:var(--text2);line-height:1.7;padding:1rem 1.25rem;background:var(--bg2);border-left:3px solid var(--green);}\n' +
    '.content h2{font-family:var(--mono);font-size:18px;font-weight:500;margin:2rem 0 1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border);}\n' +
    '.content p{color:var(--text2);margin-bottom:1.25rem;line-height:1.8;font-size:15px;}\n' +
    '.content ul,.content ol{color:var(--text2);padding-left:1.5rem;margin-bottom:1.25rem;font-size:15px;}\n' +
    '.content li{margin-bottom:0.5rem;line-height:1.7;}\n' +
    '.content strong{color:var(--text);font-weight:500;}\n' +
    '.content a{color:var(--green);}\n' +
    '.cta{background:var(--bg2);border:1px solid var(--border2);padding:1.25rem;margin:2rem 0;}\n' +
    '.cta p{color:var(--text2);font-size:14px;margin-bottom:0.75rem;}\n' +
    '.cta-btn{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:600;padding:8px 18px;background:var(--green);color:#000;margin-right:8px;margin-bottom:4px;}\n' +
    '.cta-btn:hover{background:#fff;text-decoration:none;}\n' +
    '.sidebar{display:flex;flex-direction:column;gap:1.5rem;}\n' +
    '.sc{background:var(--surface);border:1px solid var(--border);padding:1.25rem;}\n' +
    '.st{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text3);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);}\n' +
    '.tl{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;}\n' +
    '.tl:last-child{border-bottom:none;padding-bottom:0;}\n' +
    '.tb{font-family:var(--mono);font-size:10px;padding:2px 6px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);}\n' +
    '.nb{width:100%;background:var(--green);color:#000;font-family:var(--mono);font-size:12px;font-weight:600;padding:10px;border:none;cursor:pointer;}\n' +
    '.nb:hover{background:#fff;}\n' +
    'footer{border-top:1px solid var(--border);padding:1.5rem 2rem;margin-top:2rem;}\n' +
    '.fi{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;}\n' +
    '.fl{font-family:var(--mono);font-size:14px;color:var(--green);}\n' +
    '.fli{display:flex;gap:1rem;font-family:var(--mono);font-size:11px;}\n' +
    '.fli a{color:var(--text3);}.fli a:hover{color:var(--green);text-decoration:none;}\n' +
    '.fc{font-family:var(--mono);font-size:11px;color:var(--text3);}\n' +
    '@media(max-width:768px){.layout{grid-template-columns:1fr;}.sidebar{display:none;}nav{display:none;}}\n' +
    '</style>\n</head>\n<body>\n\n' +

    '<header><div class="header-inner">\n' +
    '<a href="/" class="logo"><div class="live-dot"></div>[CyberWatch Daily]</a>\n' +
    '<nav><a href="/">News</a><a href="/blog/">Blog</a><a href="/#newsletter">Newsletter</a><a href="/contact.html">Contact</a></nav>\n' +
    '</div></header>\n\n' +

    '<div class="layout">\n<article>\n' +
    '<a href="/blog/" class="back">← Back to Blog</a>\n' +
    '<div class="article-header">\n' +
    '<div class="meta"><span class="cat">' + post.category + '</span><span class="date">' + formattedDate + '</span><span class="rt">' + readTime + ' min read</span></div>\n' +
    '<h1>' + post.title + '</h1>\n' +
    '<div class="excerpt">' + post.excerpt + '</div>\n' +
    '</div>\n' +
    '<div class="content">\n' + post.content + '\n</div>\n' +
    '<div class="cta">\n' +
    '<p><strong>Stay protected</strong> with tools our security experts recommend:</p>\n' +
    '<a href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902" target="_blank" rel="noopener" class="cta-btn">Get NordVPN - 70% Off</a>\n' +
    '<a href="https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356" target="_blank" rel="noopener" class="cta-btn">Try NordPass Free</a>\n' +
    '<a href="https://bitwarden.com" target="_blank" rel="noopener" class="cta-btn">Try Bitwarden Free</a>\n' +
    '</div>\n</article>\n\n' +

    '<aside class="sidebar">\n' +
    '<div class="sc"><div class="st">Daily Newsletter</div>\n' +
    '<p style="font-size:13px;color:var(--text2);margin-bottom:1rem;line-height:1.6;">Get daily threat intelligence in your inbox. Free.</p>\n' +
    '<button class="nb" onclick="window.open(\'https://cyberwatchdaily.beehiiv.com/subscribe\',\'_blank\')">Subscribe Free</button>\n' +
    '</div>\n' +
    '<div class="sc"><div class="st">Recommended Tools</div>\n' +
    '<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">NordVPN</div><div style="font-size:11px;color:var(--text3);">Best-in-class VPN</div></div><a href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902" target="_blank" class="tb">70% Off</a></div>\n' +
    '<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">NordPass</div><div style="font-size:11px;color:var(--text3);">Password manager</div></div><a href="https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356" target="_blank" class="tb">Free</a></div>\n' +
    '<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">Bitwarden</div><div style="font-size:11px;color:var(--text3);">Open-source vault</div></div><a href="https://bitwarden.com" target="_blank" class="tb">Free</a></div>\n' +
    '</div>\n' +
    '<div class="sc"><div class="st">More Articles</div>\n' +
    '<a href="/blog/" style="font-family:var(--mono);font-size:12px;color:var(--text2);">View all articles</a>\n' +
    '</div>\n</aside>\n</div>\n\n' +

    '<footer><div class="fi">\n' +
    '<div class="fl">[CyberWatch Daily]</div>\n' +
    '<div class="fli"><a href="/">Home</a><a href="/blog/">Blog</a><a href="/contact.html">Contact</a><a href="/privacy-policy.html">Privacy</a></div>\n' +
    '<div class="fc">2026 CyberWatch Daily</div>\n' +
    '</div></footer>\n\n</body>\n</html>';
}

function updateBlogIndex(post, slug, dateStr) {
  const indexPath = path.join(__dirname, '../blog/index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const card = '\n      <a href="/blog/' + slug + '.html" class="post-card">' +
    '<div class="post-meta"><span class="post-category">' + post.category + '</span><span class="post-date">' + formattedDate + '</span></div>' +
    '<div class="post-title">' + post.title + '</div>' +
    '<div class="post-excerpt">' + post.excerpt + '</div>' +
    '<div class="post-footer"><span class="read-time">' + readTime + ' min read</span><span class="read-more">Read article</span></div>' +
    '</a>';

  // Remove empty state
  html = html.replace(/<div class="empty-state">[\s\S]*?<\/div>\s*/g, '');

  // Insert after opening posts-grid tag
  html = html.replace(
    '<div class="posts-grid" id="posts-grid">',
    '<div class="posts-grid" id="posts-grid">' + card
  );

  fs.writeFileSync(indexPath, html);
  console.log('Blog index updated');
}

function updateHomepageBlogPreview(post, slug, dateStr) {
  var indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('index.html not found, skipping homepage update');
    return;
  }

  var html = fs.readFileSync(indexPath, 'utf8');
  var formattedDate = new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  var newEntry = '{\n      title: "' + post.title.replace(/"/g, '\\"') + '",\n      category: "' + post.category + '",\n      url: "/blog/' + slug + '.html",\n      date: "' + formattedDate + '",\n      excerpt: "' + post.excerpt.replace(/"/g, '\\"').substring(0, 150) + '..."\n    }';

  // Insert new post at the beginning of the posts array
  html = html.replace('  var posts = [', '  var posts = [\n    ' + newEntry + ',');

  // Keep only 2 posts by removing extras (find third occurrence of closing brace pattern)
  var postsMatch = html.match(/var posts = \[([\s\S]*?)\];/);
  if (postsMatch) {
    var postsContent = postsMatch[1];
    var entries = postsContent.split('},\n    {');
    if (entries.length > 2) {
      var trimmed = entries.slice(0, 2).join('},\n    {');
      if (!trimmed.endsWith('}')) trimmed += '}';
      html = html.replace(postsMatch[0], 'var posts = [' + trimmed + '\n  ];');
    }
  }

  fs.writeFileSync(indexPath, html);
  console.log('Homepage blog preview updated');
}

async function main() {
  try {
    console.log('CyberWatch Blog Post Generator Starting...');

    const post = await generatePost();
    console.log('Generated: ' + post.title);

    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(post.title) + '-' + today;

    const postHTML = buildPostHTML(post, slug, today);
    const postPath = path.join(__dirname, '../blog', slug + '.html');
    fs.writeFileSync(postPath, postHTML);
    console.log('Post saved: blog/' + slug + '.html');

    updateBlogIndex(post, slug, today);
    updateHomepageBlogPreview(post, slug, today);

    // Update sitemap
    const sitemapPath = path.join(__dirname, '../sitemap.xml');
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const newUrl = '  <url>\n    <loc>https://cyberwatchdaily.net/blog/' + slug + '.html</loc>\n    <lastmod>' + today + '</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.7</priority>\n  </url>';
    sitemap = sitemap.replace('</urlset>', newUrl + '\n</urlset>');
    fs.writeFileSync(sitemapPath, sitemap);
    console.log('Sitemap updated');

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
