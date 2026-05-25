const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Get week date range for title
function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return { start: fmt(monday), end: fmt(sunday), slug: monday.toISOString().slice(0, 10) };
}

async function fetchTopStories() {
  console.log('Fetching top stories from news API...');
  try {
    const resp = await fetch('https://cyberwatchdaily.net/api/news');
    const data = await resp.json();
    const articles = data.articles || [];
    // Get top 5 — mix of cybersecurity, crypto, and quantum
    const cyber = articles.filter(a => a.domain === 'cybersecurity').slice(0, 2);
    const crypto = articles.filter(a => a.domain === 'crypto').slice(0, 2);
    const quantum = articles.filter(a => a.domain === 'quantum').slice(0, 1);
    return [...cyber, ...crypto, ...quantum].slice(0, 5);
  } catch (err) {
    console.error('Failed to fetch stories:', err.message);
    // Fallback stories for testing
    return [
      { title: 'Major ransomware group claims attack on healthcare provider', summary: 'A ransomware gang has claimed responsibility for an attack on a major US healthcare provider, potentially exposing millions of patient records.', domain: 'cybersecurity', source: 'The Hacker News' },
      { title: 'Critical zero-day vulnerability discovered in popular VPN software', summary: 'Security researchers have identified a critical zero-day flaw affecting millions of VPN users worldwide.', domain: 'cybersecurity', source: 'BleepingComputer' },
      { title: 'Bitcoin ETF sees record inflows as institutional interest surges', summary: 'Spot Bitcoin ETFs recorded their highest single-day inflows this week as major institutions increased crypto allocations.', domain: 'crypto', source: 'CoinDesk' },
      { title: 'DeFi protocol loses $45 million in smart contract exploit', summary: 'A popular decentralized finance protocol was drained of $45 million after attackers exploited a vulnerability in its smart contract code.', domain: 'crypto', source: 'The Block' },
      { title: 'IBM announces quantum processor milestone threatening current encryption', summary: 'IBM Research unveiled a new quantum processor that brings the threat to RSA encryption significantly closer to reality.', domain: 'quantum', source: 'IBM Research' },
    ];
  }
}

async function generatePodcastScript(stories, weekRange) {
  console.log('Generating podcast script with Claude...');

  const storiesText = stories.map((s, i) =>
    `Story ${i + 1} [${s.domain.toUpperCase()}] — ${s.source}\nTitle: ${s.title}\nSummary: ${s.summary}`
  ).join('\n\n');

  const prompt = `You are writing a weekly cybersecurity podcast script for "CyberWatch Weekly" — a sharp, witty, and informative show hosted by two co-hosts:

DENNIS MILLER: The cynical, worldly co-host. Sharp wit, dry humor, uses the occasional pop-culture reference or historical analogy. Not afraid to call out bad actors. Thinks like a skeptic who has seen it all. Delivers punchy one-liners but always stays informative.

SARA CUNNINGHAM: The sharp, technically savvy co-host. Deeply knowledgeable, explains things clearly and confidently. Occasionally pushes back on Dennis with facts. Warm but direct. Has a talent for making complex topics (like quantum computing) accessible and interesting.

Write a complete podcast script for the week of ${weekRange.start} to ${weekRange.end} covering these top stories:

${storiesText}

SCRIPT FORMAT REQUIREMENTS:
- Open with a punchy intro (both hosts together, set the tone for the week)
- Cover each story as a natural back-and-forth conversation — NOT a news reading. They discuss, debate, react, and add commentary.
- Each story segment: 150-200 words of dialogue
- Dennis gets at least one sharp quip or witty observation per story
- Sara provides the technical depth and context
- Include natural transitions between stories ("Speaking of bad actors..." / "And if that wasn't enough...")
- Include an affiliate mention naturally — something like Sara recommending NordVPN (https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902) after a VPN story, or NordPass after a password breach story
- Close with a punchy sign-off from both hosts and a call to action to subscribe at cyberwatchdaily.net
- Total length: 800-1000 words of dialogue
- Format each line as: DENNIS: [dialogue] or SARA: [dialogue]
- No stage directions needed — just the dialogue

Make it feel like a real podcast — conversational, opinionated, occasionally funny, always informative. These hosts have chemistry.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

async function savePodcastFiles(script, stories, weekRange) {
  // Create podcasts directory if needed
  const podcastDir = path.join(process.cwd(), 'podcasts');
  if (!fs.existsSync(podcastDir)) fs.mkdirSync(podcastDir, { recursive: true });

  const filename = `cyberwatch-weekly-${weekRange.slug}`;

  // Save raw script as markdown
  const scriptMd = `# CyberWatch Weekly — ${weekRange.start} to ${weekRange.end}

**Hosts:** Dennis Miller & Sara Cunningham
**Episode:** Week of ${weekRange.start}
**Stories covered:** ${stories.length}

---

## This Week's Stories

${stories.map((s, i) => `${i + 1}. [${s.domain.toUpperCase()}] **${s.title}** — *${s.source}*`).join('\n')}

---

## Podcast Script

${script}

---

*CyberWatch Daily — cyberwatchdaily.net*
*Subscribe to our daily newsletter for threat intelligence delivered to your inbox.*
*Protect yourself with [NordVPN](https://go.nordvpn.net/aff_c?offer_id=15&aff_id=144963&url_id=902) — 70% off this week.*
`;

  fs.writeFileSync(path.join(podcastDir, `${filename}.md`), scriptMd);
  console.log(`✅ Script saved: podcasts/${filename}.md`);

  // Save ElevenLabs-ready version — split by speaker for TTS
  const lines = script.split('\n').filter(l => l.trim());
  const dennisLines = lines.filter(l => l.startsWith('DENNIS:')).map(l => l.replace('DENNIS:', '').trim());
  const saraLines = lines.filter(l => l.startsWith('SARA:')).map(l => l.replace('SARA:', '').trim());

  const ttsJson = {
    episode: `CyberWatch Weekly — ${weekRange.start}`,
    hosts: {
      dennis: { voice: 'Dennis Miller', lines: dennisLines },
      sara: { voice: 'Sara Cunningham', lines: saraLines },
    },
    full_script: lines.map(l => {
      if (l.startsWith('DENNIS:')) return { speaker: 'dennis', text: l.replace('DENNIS:', '').trim() };
      if (l.startsWith('SARA:')) return { speaker: 'sara', text: l.replace('SARA:', '').trim() };
      return null;
    }).filter(Boolean),
  };

  fs.writeFileSync(path.join(podcastDir, `${filename}-tts.json`), JSON.stringify(ttsJson, null, 2));
  console.log(`✅ TTS file saved: podcasts/${filename}-tts.json`);

  return { filename, scriptMd };
}

async function main() {
  console.log('🎙️  CyberWatch Weekly Podcast Generator');
  console.log('==========================================');

  const weekRange = getWeekRange();
  console.log(`📅 Week: ${weekRange.start} to ${weekRange.end}`);

  const stories = await fetchTopStories();
  console.log(`📰 Fetched ${stories.length} top stories`);

  const script = await generatePodcastScript(stories, weekRange);
  const { filename } = await savePodcastFiles(script, stories, weekRange);

  console.log('\n✅ Podcast generation complete!');
  console.log(`📝 Script: podcasts/${filename}.md`);
  console.log(`🔊 TTS JSON: podcasts/${filename}-tts.json`);
  console.log('\nNext steps:');
  console.log('1. Review the script in podcasts/*.md');
  console.log('2. Upload the TTS JSON to ElevenLabs to generate audio');
  console.log('3. Upload the MP3 to Spotify for Podcasters (anchor.fm)');
  console.log('4. Embed the Spotify player on cyberwatchdaily.net/podcast.html');
}

main().catch(console.error);
