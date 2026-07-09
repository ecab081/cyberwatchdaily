/**
 * One-time fix script — run via GitHub Actions or locally
 * Fixes: Latest from Blog section + About section + nav About link in index.html
 * Usage: node scripts/fix-homepage.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, 'blog');
const INDEX = path.join(ROOT, 'index.html');

// ── 1. Read the most recent blog posts from the blog folder ───────────────────
function getRecentPosts(n = 2) {
  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => ({
      file: f,
      mtime: fs.statSync(path.join(BLOG_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, n);

  return files.map(({ file }) => {
    const html = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');

    // Title
    let title = '';
    const t1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    if (t1) title = t1[1].replace(/<[^>]+>/g, '').trim();
    if (!title) {
      const t2 = html.match(/property="og:title"[^>]*content="([^"]+)"/) ||
                 html.match(/content="([^"]+)"[^>]*property="og:title"/);
      if (t2) title = t2[1].replace(/ - CyberWatch Daily/, '').trim();
    }

    // Category
    let category = 'Security Deep Dive';
    const c1 = html.match(/class="cat"[^>]*>([\s\S]*?)<\/span>/) ||
               html.match(/class="post-category"[^>]*>([\s\S]*?)<\/span>/);
    if (c1) category = c1[1].trim();

    // Excerpt
    let excerpt = '';
    const e1 = html.match(/class="excerpt"[^>]*>([\s\S]*?)<\/div>/) ||
               html.match(/class="article-excerpt"[^>]*>([\s\S]*?)<\/div>/);
    if (e1) excerpt = e1[1].replace(/<[^>]+>/g, '').trim().substring(0, 150);
    if (!excerpt) {
      const e2 = html.match(/property="og:description"[^>]*content="([^"]+)"/) ||
                 html.match(/content="([^"]+)"[^>]*property="og:description"/);
      if (e2) excerpt = e2[1].substring(0, 150);
    }

    // Date from filename (e.g. ...-2026-07-08.html)
    const dm = file.match(/(\d{4}-\d{2}-\d{2})\.html$/);
    const date = dm ? new Date(dm[1]).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '';

    const slug = file.replace('.html', '');

    console.log(`  Found: ${title} (${date})`);
    return { title, category, url: `/blog/${slug}.html`, date, excerpt };
  });
}

// ── 2. Patch index.html ────────────────────────────────────────────────────────
function patch() {
  let html = fs.readFileSync(INDEX, 'utf8');
  const original = html;

  // Fix 1: About nav link — #about → /about.html
  html = html.replace(/href="#about"/g, 'href="/about.html"');
  console.log('Nav About link fixed');

  // Fix 2: About section text — replace generic copy with E. Cab attribution
  const aboutOld = /(<[^>]+id="about"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>)([\s\S]*?)(<\/section>|<!-- \/about -->|<!-- contact -->|<section|<div class="footer|<footer)/i;
  // More targeted: replace the paragraph text inside the about section
  html = html.replace(
    /CyberWatch Daily is run by a cybersecurity professional with hands-on experience in the field\.[\s\S]*?without having to wade through dozens of sources yourself\./,
    `Written by <strong><a href="/about.html" style="color:inherit;">E. Cab</a></strong>, a cybersecurity analyst with hands-on experience in defensive operations, threat intelligence, and incident response.
 CyberWatch Daily delivers daily threat intelligence and expert analysis to help individuals and organizations stay ahead of the latest cyber threats.
<br><br>
Every story is AI-curated, analyst-reviewed, and threat-rated so you can quickly understand what matters most — without having to wade through dozens of sources yourself.
<br><br>
<a href="/about.html" style="color:var(--green);font-family:monospace;font-size:13px;">Learn more about us →</a>`
  );
  console.log('About section text updated');

  // Fix 3: Latest from Blog — replace var posts array with recent actual posts
  const posts = getRecentPosts(2);
  if (posts.length === 0) {
    console.log('WARNING: No blog posts found in /blog folder');
  } else {
    const entries = posts.map(p =>
      `{\n      title: ${JSON.stringify(p.title)},\n      category: ${JSON.stringify(p.category)},\n      url: ${JSON.stringify(p.url)},\n      date: ${JSON.stringify(p.date)},\n      excerpt: ${JSON.stringify(p.excerpt + '...')}\n    }`
    ).join(',\n    ');

    const newArray = `var posts = [\n    ${entries}\n  ]`;

    // Replace with a robust regex that handles any whitespace
    const replaced = html.replace(
      /var\s+posts\s*=\s*\[[\s\S]*?\]\s*;/,
      newArray + ';'
    );

    if (replaced === html) {
      console.log('WARNING: Could not find var posts array in index.html — check manually');
    } else {
      html = replaced;
      console.log(`Blog preview updated with ${posts.length} recent posts`);
    }
  }

  if (html !== original) {
    fs.writeFileSync(INDEX, html);
    console.log('index.html saved');
  } else {
    console.log('No changes made to index.html');
  }
}

console.log('Fixing homepage...');
patch();
console.log('Done.');
