export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search the web for the top 8 cybersecurity news stories from the last 24-48 hours. Find real, current articles.

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {
    "title": "Full article headline",
    "source": "Publication name",
    "url": "https://direct-article-url",
    "summary": "2-3 sentence plain English summary of what happened and why it matters to security professionals.",
    "threat_level": 1,
    "category": "Ransomware|Data Breach|Vulnerability|Malware|Nation-State|Phishing|Zero-Day|Regulation|Other"
  }
]
threat_level: 1=Info, 2=Low, 3=Medium, 4=High, 5=Critical. Return ONLY the JSON array.`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawText = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = rawText.match(/\[[\s\S]*?\]/);
    if (!match) return res.status(500).json({ error: 'Could not parse AI response' });

    const articles = JSON.parse(match[0]);
    res.status(200).json({ articles });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
