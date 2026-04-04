const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BEEHIIV_API_KEY   = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUB_ID    = process.env.BEEHIIV_PUB_ID;

// ── 1. Fetch today's cybersecurity news via Claude + web search ──────────────
async function fetchNews() {
  console.log('🔍 Scanning threat intelligence feeds...');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search the web for the top 6 cybersecurity news stories from the last 24 hours.

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {
    "title": "Full article headline",
    "source": "Publication name",
    "url": "https://direct-article-url",
    "summary": "2-3 sentence plain English summary of what happened and why it matters.",
    "threat_level": 3,
    "category": "Ransomware|Data Breach|Vulnerability|Malware|Nation-State|Phishing|Zero-Day|Regulation|Other"
  }
]
threat_level: 1=Info, 2=Low, 3=Medium, 4=High, 5=Critical. Return ONLY the JSON array.`
      }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);

  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('Could not parse AI response');

  return JSON.parse(match[0]);
}

// ── 2. Format articles into a clean HTML email ───────────────────────────────
function buildEmailHtml(articles) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const THREAT_LABELS = { 1:'INFO', 2:'LOW', 3:'MEDIUM', 4:'HIGH', 5:'CRITICAL' };
  const THREAT_COLORS = { 1:'#0066cc', 2:'#339900', 3:'#cc8800', 4:'#cc4400', 5:'#cc0000' };

  const critical = articles.filter(a => a.threat_level >= 4).length;

  const articleRows = articles.map(a => {
    const color = THREAT_COLORS[a.threat_level] || '#888';
    const label = THREAT_LABELS[a.threat_level] || 'INFO';
    return `
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid #1e2d1e;">
        <div style="margin-bottom: 8px;">
          <span style="background:${color}22; color:${color}; border: 1px solid ${color}44;
            font-family: monospace; font-size: 11px; font-weight: bold;
            padding: 2px 8px; margin-right: 8px;">${label}</span>
          <span style="background:#1a2a1a; color:#7a9e8a;
            font-family: monospace; font-size: 11px;
            padding: 2px 8px; border: 1px solid #2a3a2a;">${a.category}</span>
        </div>
        <h2 style="margin: 8px 0; font-size: 17px; font-weight: 600; line-height: 1.4;">
          <a href="${a.url}" style="color: #e0edd6; text-decoration: none;">${a.title}</a>
        </h2>
        <p style="margin: 6px 0 10px; color: #7a9e8a; font-size: 14px; line-height: 1.65;">
          ${a.summary}
        </p>
        <a href="${a.url}" style="font-family: monospace; font-size: 12px; color: #00ff88;">
          Read full story →
        </a>
        <span style="font-family: monospace; font-size: 11px; color: #3d5a47; margin-left: 12px;">
          via ${a.source}
        </span>
      </td>
    </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#080c0f; font-family: 'IBM Plex Sans', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080c0f;">
    <tr><td align="center" style="padding: 20px 16px;">

      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0d1317; border-bottom: 1px solid rgba(0,255,136,0.2); padding: 20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #00ff88;">
                    [ CyberWatch Daily ]
                  </span><br>
                  <span style="font-family: monospace; font-size: 11px; color: #3d5a47;">
                    ${today}
                  </span>
                </td>
                <td align="right">
                  <span style="background: #00ff8822; color: #00ff88; border: 1px solid #00ff8844;
                    font-family: monospace; font-size: 11px; font-weight: bold; padding: 4px 10px;">
                    ${articles.length} STORIES
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ALERT BAR (only if critical/high threats) -->
        ${critical > 0 ? `
        <tr>
          <td style="background:#3d000022; border-left: 3px solid #cc0000; padding: 12px 28px;">
            <span style="font-family: monospace; font-size: 12px; color: #ff4444;">
              ⚠ ${critical} CRITICAL/HIGH SEVERITY THREAT${critical > 1 ? 'S' : ''} TODAY — REVIEW IMMEDIATELY
            </span>
          </td>
        </tr>` : ''}

        <!-- ARTICLES -->
        <tr>
          <td style="background:#0d1317; padding: 8px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${articleRows}
            </table>
          </td>
        </tr>

        <!-- TOOLS SECTION -->
        <tr>
          <td style="background:#0d1317; padding: 20px 28px; border-top: 1px solid rgba(0,255,136,0.1);">
            <p style="font-family: monospace; font-size: 11px; color: #3d5a47; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 2px;">
              // Recommended Security Tools
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #1e2d1e;">
                  <span style="color: #e0edd6; font-size: 13px;">🔒 NordVPN</span>
                  <span style="color: #7a9e8a; font-size: 12px; margin-left: 8px;">Best-in-class VPN protection</span>
                  <a href="https://nordvpn.com" style="float:right; font-family:monospace; font-size:11px; color:#00ff88;">Get 70% Off →</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #1e2d1e;">
                  <span style="color: #e0edd6; font-size: 13px;">🔑 1Password</span>
                  <span style="color: #7a9e8a; font-size: 12px; margin-left: 8px;">Password manager</span>
                  <a href="https://1password.com" style="float:right; font-family:monospace; font-size:11px; color:#00ff88;">Try Free →</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0;">
                  <span style="color: #e0edd6; font-size: 13px;">🛡 Malwarebytes</span>
                  <span style="color: #7a9e8a; font-size: 12px; margin-left: 8px;">Malware protection</span>
                  <a href="https://malwarebytes.com" style="float:right; font-family:monospace; font-size:11px; color:#00ff88;">Try Free →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#080c0f; padding: 20px 28px; border-top: 1px solid rgba(0,255,136,0.1); text-align: center;">
            <p style="font-family: monospace; font-size: 11px; color: #3d5a47; margin: 0 0 8px;">
              <a href="https://cyberwatchdaily.net" style="color: #00ff88; text-decoration:none;">cyberwatchdaily.net</a>
              &nbsp;·&nbsp; AI-powered threat intelligence
            </p>
            <p style="font-family: monospace; font-size: 10px; color: #2a3a2a; margin: 0;">
              You're receiving this because you subscribed at cyberwatchdaily.net.
              <a href="{{unsubscribe_url}}" style="color: #3d5a47;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 3. Create & send post via Beehiiv API ────────────────────────────────────
async function sendNewsletter(articles) {
  console.log('📧 Sending newsletter via Beehiiv...');

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  const critical = articles.filter(a => a.threat_level >= 4).length;
  const subject = critical > 0
    ? `⚠ ${critical} Critical Threat${critical > 1 ? 's' : ''} Today — CyberWatch Daily ${today}`
    : `CyberWatch Daily — Top ${articles.length} Cyber Threats for ${today}`;

  const html = buildEmailHtml(articles);

  // Create the post
  const createRes = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEEHIIV_API_KEY}`
    },
    body: JSON.stringify({
      subject,
      content: { free: { html } },
      status: 'confirmed',
      send_at: Math.floor(Date.now() / 1000) + 60, // send in 1 minute
      audience: 'free'
    })
  });

  const result = await createRes.json();

  if (result.errors || result.error) {
    throw new Error(`Beehiiv error: ${JSON.stringify(result.errors || result.error)}`);
  }

  console.log(`✅ Newsletter scheduled! Post ID: ${result.data?.id}`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('🚀 CyberWatch Daily Newsletter Automation Starting...');
    const articles = await fetchNews();
    console.log(`✅ Found ${articles.length} stories`);
    await sendNewsletter(articles);
    console.log('🎉 Done! Newsletter sent successfully.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
