const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BEEHIIV_API_KEY   = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUB_ID    = process.env.BEEHIIV_PUB_ID;
const RESEND_API_KEY     = process.env.RESEND_API_KEY;

async function fetchNews() {
  console.log('Scanning threat intelligence feeds...');
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
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search the web for the top 5 cybersecurity news stories from the last 24 hours. Return ONLY a valid JSON array, no markdown, no extra text:
[{"title":"headline","source":"publication","url":"https://url","summary":"2-3 sentence summary","threat_level":3,"category":"Ransomware|Data Breach|Vulnerability|Malware|Nation-State|Phishing|Zero-Day|Regulation|Other"}]
threat_level: 1=Info,2=Low,3=Medium,4=High,5=Critical. Return ONLY the JSON array.`
      }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse AI response');
  return JSON.parse(match[0]);
}

async function getSubscribers() {
  console.log('Fetching subscribers from Beehiiv...');
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions?status=active&limit=100`,
    { headers: { 'Authorization': `Bearer ${BEEHIIV_API_KEY}` } }
  );
  const data = await res.json();
  if (data.errors) throw new Error(`Beehiiv error: ${JSON.stringify(data.errors)}`);
  const emails = (data.data || []).map(s => s.email).filter(Boolean);
  console.log(`Found ${emails.length} subscribers`);
  return emails;
}

function buildEmailHtml(articles, blogPost = null) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const LABELS = {1:'INFO',2:'LOW',3:'MEDIUM',4:'HIGH',5:'CRITICAL'};
  const COLORS = {1:'#0066cc',2:'#339900',3:'#cc8800',4:'#cc4400',5:'#cc0000'};
  const critical = articles.filter(a => a.threat_level >= 4).length;

  const rows = articles.map(a => {
    const c = COLORS[a.threat_level]||'#888';
    const l = LABELS[a.threat_level]||'INFO';
    return `<tr><td style="padding:20px 0;border-bottom:1px solid #1e2d1e;">
      <div style="margin-bottom:8px;">
        <span style="background:${c}22;color:${c};border:1px solid ${c}44;font-family:monospace;font-size:11px;font-weight:bold;padding:2px 8px;margin-right:8px;">${l}</span>
        <span style="background:#1a2a1a;color:#7a9e8a;font-family:monospace;font-size:11px;padding:2px 8px;">${a.category}</span>
      </div>
      <h2 style="margin:8px 0;font-size:17px;font-weight:600;line-height:1.4;">
        <a href="${a.url}" style="color:#e0edd6;text-decoration:none;">${a.title}</a>
      </h2>
      <p style="margin:6px 0 10px;color:#7a9e8a;font-size:14px;line-height:1.65;">${a.summary}</p>
      <a href="${a.url}" style="font-family:monospace;font-size:12px;color:#00ff88;">Read full story</a>
      <span style="font-family:monospace;font-size:11px;color:#3d5a47;margin-left:12px;">via ${a.source}</span>
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080c0f;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080c0f;">
<tr><td align="center" style="padding:20px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0d1317;border-bottom:1px solid rgba(0,255,136,0.2);padding:20px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><span style="font-family:monospace;font-size:18px;font-weight:bold;color:#00ff88;">[ CyberWatch Daily ]</span><br>
    <span style="font-family:monospace;font-size:11px;color:#3d5a47;">${today}</span></td>
    <td align="right"><span style="background:#00ff8822;color:#00ff88;border:1px solid #00ff8844;font-family:monospace;font-size:11px;font-weight:bold;padding:4px 10px;">${articles.length} STORIES</span></td>
  </tr></table>
</td></tr>
${critical > 0 ? `<tr><td style="background:#3d000022;border-left:3px solid #cc0000;padding:12px 28px;"><span style="font-family:monospace;font-size:12px;color:#ff4444;">WARNING: ${critical} CRITICAL/HIGH SEVERITY THREAT${critical>1?'S':''} TODAY</span></td></tr>` : ''}
<tr><td style="background:#0d1317;padding:8px 28px 0;"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
${blogPost ? `<tr><td style="background:#0d1317;padding:20px 28px;border-top:1px solid rgba(0,255,136,0.1);">
  <p style="font-family:monospace;font-size:11px;color:#3d5a47;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">// From the Blog</p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:12px;background:#121920;border:1px solid rgba(0,255,136,0.12);">
    <span style="font-family:monospace;font-size:10px;padding:2px 8px;background:#003d1f;color:#00ff88;text-transform:uppercase;">${blogPost.category}</span>
    <h3 style="margin:8px 0 6px;font-size:15px;font-weight:600;"><a href="${blogPost.url}" style="color:#e0edd6;text-decoration:none;">${blogPost.title}</a></h3>
    <p style="margin:0 0 10px;color:#7a9e8a;font-size:13px;line-height:1.6;">${blogPost.excerpt}</p>
    <a href="${blogPost.url}" style="font-family:monospace;font-size:12px;color:#00ff88;">Read full article</a>
  </td></tr></table>
</td></tr>` : ''}
<tr><td style="background:#0d1317;padding:20px 28px;border-top:1px solid rgba(0,255,136,0.1);">
  <p style="font-family:monospace;font-size:11px;color:#3d5a47;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">// Recommended Security Tools</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;border-bottom:1px solid #1e2d1e;"><span style="color:#e0edd6;font-size:13px;">NordVPN</span> <span style="color:#7a9e8a;font-size:12px;">Best-in-class VPN</span><a href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902" style="float:right;font-family:monospace;font-size:11px;color:#00ff88;">Get 70% Off</a></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid #1e2d1e;"><span style="color:#e0edd6;font-size:13px;">NordPass</span> <span style="color:#7a9e8a;font-size:12px;">Password manager by Nord</span><a href="https://go.nordpass.io/aff_c?offer_id=488&aff_id=144963&url_id=9356" style="float:right;font-family:monospace;font-size:11px;color:#00ff88;">Try Free</a></td></tr>
    <tr><td style="padding:6px 0;"><span style="color:#e0edd6;font-size:13px;">Bitwarden</span> <span style="color:#7a9e8a;font-size:12px;">Open-source password manager</span><a href="https://bitwarden.com" style="float:right;font-family:monospace;font-size:11px;color:#00ff88;">Try Free</a></td></tr>
  </table>
</td></tr>
<tr><td style="background:#080c0f;padding:20px 28px;border-top:1px solid rgba(0,255,136,0.1);text-align:center;">
  <p style="font-family:monospace;font-size:11px;color:#3d5a47;margin:0 0 8px;"><a href="https://cyberwatchdaily.net" style="color:#00ff88;text-decoration:none;">cyberwatchdaily.net</a> · AI-powered threat intelligence</p>
  <p style="font-family:monospace;font-size:10px;color:#2a3a2a;margin:0;">You received this because you subscribed at cyberwatchdaily.net</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function sendEmails(subscribers, articles) {
  console.log(`Sending to ${subscribers.length} subscribers via Resend...`);
  const today = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  const critical = articles.filter(a => a.threat_level >= 4).length;
  const subject = critical > 0
    ? `WARNING: ${critical} Critical Threat${critical>1?'s':''} Today - CyberWatch Daily ${today}`
    : `CyberWatch Daily - Top ${articles.length} Cyber Threats for ${today}`;
  const blogPost = getLatestBlogPost();
  const html = buildEmailHtml(articles, blogPost);

  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'CyberWatch Daily <newsletter@cyberwatchdaily.net>',
        to: batch,
        subject,
        html
      })
    });
    const result = await res.json();
    if (result.statusCode >= 400 || result.name === 'validation_error') {
      throw new Error(`Resend error: ${JSON.stringify(result)}`);
    }
    console.log(`Sent batch ${Math.floor(i/50)+1} - ${Math.min(i+50, subscribers.length)}/${subscribers.length} subscribers`);
    if (i + 50 < subscribers.length) await new Promise(r => setTimeout(r, 500));
  }
}

(async () => {
  try {
    console.log('CyberWatch Daily Newsletter Automation Starting...');
    const [articles, subscribers] = await Promise.all([fetchNews(), getSubscribers()]);
    console.log(`Found ${articles.length} stories and ${subscribers.length} subscribers`);
    if (subscribers.length === 0) { console.log('No active subscribers yet - skipping send.'); process.exit(0); }
    await sendEmails(subscribers, articles);
    console.log('Done! Newsletter sent successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
