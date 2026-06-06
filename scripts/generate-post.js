const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TOPICS = [
  'Write a comprehensive, expert-level how-to guide for everyday users to dramatically improve their online security and privacy in 2026',
  'Write an in-depth threat analysis of a major current cybersecurity attack technique, including how it works, real-world examples, and detailed defense strategies',
  'Write a thorough comparison and review of the top security tools people should use to stay safe online, with pros, cons, and expert recommendations',
  'Write a comprehensive beginner-to-intermediate guide on an essential cybersecurity concept everyone must understand to stay safe in 2026',
  'Write a detailed guide on how to protect yourself and your organization from a specific high-impact type of cyber attack, with step-by-step instructions',
  'Write an expert analysis of a major recent data breach — what happened, why it matters, what data was exposed, and exactly what affected users should do',
  'Write a comprehensive guide on quantum computing and its impact on cybersecurity — what the quantum threat means for encryption, which algorithms are at risk, and how organizations should prepare for the post-quantum era in 2026',
  'Write an in-depth analysis of cryptocurrency and Web3 security threats — including wallet security, smart contract vulnerabilities, DeFi exploits, and how crypto users can protect their digital assets',
  'Write a detailed expert guide on AI-powered cyber attacks in 2026 — how threat actors are using artificial intelligence to launch more sophisticated attacks, and what defenders can do to stay ahead',
  'Write a thorough guide on supply chain attacks and third-party security risks — real-world examples, why they are so dangerous, and step-by-step strategies to protect your organization'
];

function getTopic() {
  // Count existing blog posts to determine next topic sequentially
  // This ensures all topics rotate evenly regardless of day of week
  const blogDir = path.join(__dirname, '..', 'blog');
  let postCount = 0;
  try {
    const files = fs.readdirSync(blogDir);
    postCount = files.filter(f => f.endsWith('.html') && f !== 'index.html').length;
  } catch (e) {
    // fallback to day-based if blog dir not readable
    postCount = new Date().getDay();
  }
  const topicIndex = postCount % TOPICS.length;
  console.log('Post count:', postCount, '| Topic index:', topicIndex, '| Topic:', TOPICS[topicIndex].substring(0, 60) + '...');
  return TOPICS[topicIndex];
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
  return Math.max(5, Math.ceil(content.split(' ').length / 200));
}

async function generatePost() {
  console.log('Generating blog post...');

  const topic = getTopic();

  const prompt = `${topic}

Search the web for the latest relevant information, recent examples, current statistics, and up-to-date advice.

Write a comprehensive, authoritative article that would be useful to both beginners and intermediate users. The article must:
- Be 2500-3500 words of substantive content (not counting HTML tags) — longer articles rank better and satisfy Google AdSense content requirements
- Include at least 8 distinct sections with h2 headings
- Include h3 subheadings within sections for better structure and scannability
- Include real-world examples, named incidents, specific statistics, and concrete actionable steps
- Be written in a clear, expert but accessible voice
- Include a "Key Takeaways" or "What You Need To Know" summary section
- Include a practical step-by-step section where relevant
- Include a Frequently Asked Questions (FAQ) section with 4-5 questions and detailed answers
- Include a strong conclusion that summarizes the key points and calls to action
- Naturally mention NordVPN (https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902), NordPass (https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356), or Bitwarden (https://bitwarden.com) where genuinely relevant to the topic
- Be deeply useful — something a cybersecurity professional would be proud to share

Return ONLY a valid JSON object with no markdown, no code fences, no extra text before or after:
{
  "title": "SEO-optimized title under 65 characters that includes the current year or a power word",
  "category": "How-To Guide|Threat Analysis|Tool Review|Beginner Guide|News Explainer|Security Deep Dive",
  "excerpt": "3-4 sentence compelling summary that explains exactly what the reader will learn and why it matters to them",
  "content": "Full HTML article using h2, h3, p, ul, ol, li, strong, em, blockquote tags. Minimum 1500 words of actual content. Rich with specific details, statistics, named examples, and actionable advice.",
  "seo_description": "Meta description 150-160 characters that includes the primary keyword and a clear value proposition",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

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
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error('API error: ' + data.error.message);

  const text = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse JSON response');

  const post = JSON.parse(match[0]);

  // Validate minimum content length
  const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  console.log(`Word count: ${wordCount}`);
  if (wordCount < 1000) {
    throw new Error(`Content too short: ${wordCount} words. Minimum 1000 required.`);
  }

  return post;
}

function buildPostHTML(post, slug, dateStr) {
  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const tags = (post.tags || []).map(t =>
    `<span style="font-family:var(--mono);font-size:10px;padding:2px 8px;background:var(--bg3);color:var(--text3);border:1px solid var(--border);">${t}</span>`
  ).join(' ');

  const schemaMarkup = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": dateStr,
    "dateModified": dateStr,
    "author": { "@type": "Organization", "name": "CyberWatch Daily" },
    "publisher": {
      "@type": "Organization",
      "name": "CyberWatch Daily",
      "url": "https://cyberwatchdaily.net"
    },
    "mainEntityOfPage": `https://cyberwatchdaily.net/blog/${slug}.html`
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${post.title} - CyberWatch Daily</title>
<meta name="description" content="${post.seo_description}">
<link rel="canonical" href="https://cyberwatchdaily.net/blog/${slug}.html">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.excerpt}">
<meta property="og:url" content="https://cyberwatchdaily.net/blog/${slug}.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="CyberWatch Daily">
<meta property="og:image" content="https://cyberwatchdaily.net/social-card.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${post.title}">
<meta name="twitter:description" content="${post.excerpt}">
<meta name="twitter:image" content="https://cyberwatchdaily.net/social-card.svg">
<meta name="robots" content="index, follow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${schemaMarkup}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6298202092368819" crossorigin="anonymous"></script>
<script type="text/javascript">(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7340460-0030-40c3-8d06-93cad768271a1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');</script>
<script async src="https://media.ethicalads.io/media/client/ethicalads.min.js"></script>
<style>
:root{--bg:#080c0f;--bg2:#0d1317;--bg3:#121920;--surface:#161e26;--surface2:#1c2730;--border:rgba(0,255,136,0.12);--border2:rgba(0,255,136,0.25);--green:#00ff88;--green-dark:#003d1f;--text:#e0edd6;--text2:#7a9e8a;--text3:#3d5a47;--mono:"IBM Plex Mono",monospace;--sans:"IBM Plex Sans",sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.7;}
a{color:var(--green);text-decoration:none;}a:hover{text-decoration:underline;}
header{border-bottom:1px solid var(--border);padding:0 2rem;position:sticky;top:0;background:rgba(8,12,15,0.97);backdrop-filter:blur(12px);z-index:100;}
.header-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;}
.logo{font-family:var(--mono);font-size:17px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:8px;}
.live-dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
nav{display:flex;gap:1.5rem;font-family:var(--mono);font-size:12px;}nav a{color:var(--text2);}nav a:hover{color:var(--green);text-decoration:none;}
.layout{max-width:1100px;margin:0 auto;padding:2rem;display:grid;grid-template-columns:1fr 280px;gap:2.5rem;}
.back{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;color:var(--text3);margin-bottom:1.5rem;}
.back:hover{color:var(--green);text-decoration:none;}
.article-header{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid var(--border);}
.meta{display:flex;gap:10px;align-items:center;margin-bottom:1rem;flex-wrap:wrap;}
.cat{font-family:var(--mono);font-size:10px;padding:3px 10px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);text-transform:uppercase;}
.date{font-family:var(--mono);font-size:11px;color:var(--text3);}
.rt{font-family:var(--mono);font-size:11px;color:var(--text3);}
h1{font-family:var(--mono);font-size:clamp(20px,3vw,30px);font-weight:600;line-height:1.3;margin-bottom:1rem;}
.excerpt{font-size:16px;color:var(--text2);line-height:1.8;padding:1.25rem 1.5rem;background:var(--bg2);border-left:3px solid var(--green);margin-bottom:1.5rem;}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:1rem;}
.content h2{font-family:var(--mono);font-size:19px;font-weight:500;margin:2.5rem 0 1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--border);color:var(--text);}
.content h3{font-family:var(--mono);font-size:15px;font-weight:500;margin:1.75rem 0 0.75rem;color:var(--green);}
.content p{color:var(--text2);margin-bottom:1.4rem;line-height:1.85;font-size:15px;}
.content ul,.content ol{color:var(--text2);padding-left:1.5rem;margin-bottom:1.4rem;font-size:15px;}
.content li{margin-bottom:0.6rem;line-height:1.75;}
.content strong{color:var(--text);font-weight:500;}
.content em{color:var(--text2);font-style:italic;}
.content a{color:var(--green);}
.content blockquote{border-left:3px solid var(--green);padding:1rem 1.25rem;background:var(--bg2);margin:1.5rem 0;color:var(--text2);font-style:italic;}
.ad-break{min-height:90px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin:2rem 0;color:var(--text3);font-family:var(--mono);font-size:11px;}
.cta{background:var(--bg2);border:1px solid var(--border2);padding:1.5rem;margin:2.5rem 0;}
.cta p{color:var(--text2);font-size:14px;margin-bottom:1rem;line-height:1.7;}
.cta-btn{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:600;padding:9px 20px;background:var(--green);color:#000;margin-right:8px;margin-bottom:6px;}
.cta-btn:hover{background:#fff;text-decoration:none;}
.sidebar{display:flex;flex-direction:column;gap:1.5rem;}
.sc{background:var(--surface);border:1px solid var(--border);padding:1.25rem;}
.st{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text3);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);}
.tl{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;}
.tl:last-child{border-bottom:none;padding-bottom:0;}
.tb{font-family:var(--mono);font-size:10px;padding:2px 6px;background:var(--green-dark);color:var(--green);border:1px solid var(--border2);}
.nb{width:100%;background:var(--green);color:#000;font-family:var(--mono);font-size:12px;font-weight:600;padding:10px;border:none;cursor:pointer;}
.nb:hover{background:#fff;}
footer{border-top:1px solid var(--border);padding:1.5rem 2rem;margin-top:2rem;}
.fi{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;}
.fl{font-family:var(--mono);font-size:14px;color:var(--green);}
.fli{display:flex;gap:1rem;font-family:var(--mono);font-size:11px;}
.fli a{color:var(--text3);}.fli a:hover{color:var(--green);text-decoration:none;}
.fc{font-family:var(--mono);font-size:11px;color:var(--text3);}
@media(max-width:768px){.layout{grid-template-columns:1fr;}.sidebar{display:none;}nav{display:none;}}
</style>
</head>
<body>

<header><div class="header-inner">
<a href="/" class="logo"><div class="live-dot"></div>[CyberWatch Daily]</a>
<nav><a href="/">News</a><a href="/blog/">Blog</a><a href="/tools.html">Tools</a><a href="/best-vpn-2026.html">VPN Guide</a><a href="/podcast.html">Podcast</a><a href="/#newsletter">Newsletter</a><a href="/contact.html">Contact</a></nav>
</div></header>

<div class="layout">
<article>
<a href="/blog/" class="back">← Back to Blog</a>
<div class="article-header">
<div class="meta"><span class="cat">${post.category}</span><span class="date">${formattedDate}</span><span class="rt">${readTime} min read</span></div>
<h1>${post.title}</h1>
<div class="excerpt">${post.excerpt}</div>
<div class="tags">${tags}</div>
</div>
<div class="content">
${post.content}
</div>
<div class="cta">
<p><strong>Protect yourself with tools recommended by cybersecurity professionals:</strong><br>
The tools below are independently selected by our team based on security audits, transparency, and real-world effectiveness.</p>
<a href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902" target="_blank" rel="noopener" class="cta-btn">Get NordVPN — 70% Off</a>
<a href="https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356" target="_blank" rel="noopener" class="cta-btn">Try NordPass Free</a>
<a href="https://bitwarden.com" target="_blank" rel="noopener" class="cta-btn">Try Bitwarden Free</a>
</div>
</article>

<aside class="sidebar">
<div class="sc" style="padding:0;overflow:hidden;">
<div data-ea-publisher="cyberwatchdaily" data-ea-type="image" style="width:100%;"></div>
</div>
<div class="sc"><div class="st">Daily Newsletter</div>
<p style="font-size:13px;color:var(--text2);margin-bottom:1rem;line-height:1.6;">Get daily threat intelligence delivered to your inbox every morning. Free, no spam.</p>
<button class="nb" onclick="window.open('https://cyberwatchdaily.beehiiv.com/subscribe','_blank')">Subscribe Free →</button>
</div>
<div class="sc"><div class="st">Recommended Tools</div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">NordVPN</div><div style="font-size:11px;color:var(--text3);">Best-in-class VPN protection</div></div><a href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902" target="_blank" class="tb">70% Off</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">NordPass</div><div style="font-size:11px;color:var(--text3);">Secure password manager</div></div><a href="https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356" target="_blank" class="tb">Free</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">Bitwarden</div><div style="font-size:11px;color:var(--text3);">Open-source vault</div></div><a href="https://bitwarden.com" target="_blank" class="tb">Free</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">DeleteMe</div><div style="font-size:11px;color:var(--text3);">Remove your data</div></div><a href="https://joindeleteme.com/refer?coupon=DELETEME10" target="_blank" class="tb">10% Off</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">Aura</div><div style="font-size:11px;color:var(--text3);">Identity protection</div></div><a href="https://www.aura.com/" target="_blank" class="tb">Try Free</a></div>
</div>
<div class="sc"><div class="st">More Articles</div>
<a href="/blog/" style="font-family:var(--mono);font-size:12px;color:var(--text2);">View all articles →</a>
</div>
<div class="sc"><div class="st">Security Hardware</div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">YubiKey 5 NFC</div><div style="font-size:11px;color:var(--text3);">Best hardware security key</div></div><a href="https://www.amazon.com/dp/B08DHL1YDL?tag=cyberwatchdai-20" target="_blank" class="tb">Buy →</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">YubiKey 5C NFC</div><div style="font-size:11px;color:var(--text3);">USB-C + NFC version</div></div><a href="https://www.amazon.com/dp/B08F5D5X7T?tag=cyberwatchdai-20" target="_blank" class="tb">Buy →</a></div>
<div class="tl"><div><div style="color:var(--text);font-weight:500;font-size:13px;">Privacy Screen</div><div style="font-size:11px;color:var(--text3);">Anti-spy laptop filter</div></div><a href="https://www.amazon.com/s?k=privacy+screen+filter+laptop&tag=cyberwatchdai-20" target="_blank" class="tb">Shop →</a></div>
</div>
</aside>
</div>

<footer><div class="fi">
<div class="fl">[CyberWatch Daily]</div>
<div class="fli"><a href="/">Home</a><a href="/blog/">Blog</a><a href="/contact.html">Contact</a><a href="/privacy-policy.html">Privacy</a></div>
<div class="fc">© 2026 CyberWatch Daily · cyberwatchdaily.net</div>
</div></footer>

</body>
</html>`;
}

function updateBlogIndex(post, slug, dateStr) {
  const indexPath = path.join(__dirname, '../blog/index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const readTime = getReadTime(post.content);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const card = `
      <a href="/blog/${slug}.html" class="post-card">` +
    `<div class="post-meta"><span class="post-category">${post.category}</span><span class="post-date">${formattedDate}</span></div>` +
    `<div class="post-title">${post.title}</div>` +
    `<div class="post-excerpt">${post.excerpt}</div>` +
    `<div class="post-footer"><span class="read-time">${readTime} min read</span><span class="read-more">Read article</span></div>` +
    `</a>`;

  html = html.replace(/<div class="empty-state">[\s\S]*?<\/div>\s*/g, '');
  html = html.replace(
    '<div class="posts-grid" id="posts-grid">',
    '<div class="posts-grid" id="posts-grid">' + card
  );

  fs.writeFileSync(indexPath, html);
  console.log('Blog index updated');
}

function updateHomepageBlogPreview(post, slug, dateStr) {
  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('index.html not found, skipping homepage update');
    return;
  }

  let html = fs.readFileSync(indexPath, 'utf8');
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const newEntry = `{
      title: "${post.title.replace(/"/g, '\\"')}",
      category: "${post.category}",
      url: "/blog/${slug}.html",
      date: "${formattedDate}",
      excerpt: "${post.excerpt.replace(/"/g, '\\"').substring(0, 150)}..."
    }`;

  html = html.replace('  var posts = [', '  var posts = [\n    ' + newEntry + ',');

  const postsMatch = html.match(/var posts = \[([\s\S]*?)\];/);
  if (postsMatch) {
    const postsContent = postsMatch[1];
    const entries = postsContent.split('},\n    {');
    if (entries.length > 2) {
      let trimmed = entries.slice(0, 2).join('},\n    {');
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
    const newUrl = `  <url>\n    <loc>https://cyberwatchdaily.net/blog/${slug}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.7</priority>\n  </url>`;
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

