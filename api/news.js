export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    articles: [
      {
        title: 'Demo story: Critical zero-day under active exploitation',
        summary: 'This is a placeholder article so you can confirm the frontend is rendering correctly. Replace this API with your real news pipeline once the page is loading again.',
        url: 'https://cyberwatchdaily.net',
        source: 'CyberWatch Daily Demo',
        category: 'Zero-Day',
        threat_level: 5
      },
      {
        title: 'Demo story: Ransomware group targets managed service providers',
        summary: 'Use the same object shape for real articles returned by your backend: title, summary, url, source, category, and threat_level.',
        url: 'https://cyberwatchdaily.net',
        source: 'CyberWatch Daily Demo',
        category: 'Ransomware',
        threat_level: 4
      },
      {
        title: 'Demo story: New vulnerability disclosure roundup',
        summary: 'Once this endpoint is live at /api/news, your homepage should stop getting stuck and begin rendering cards.',
        url: 'https://cyberwatchdaily.net',
        source: 'CyberWatch Daily Demo',
        category: 'Vulnerability',
        threat_level: 3
      }
    ]
  });
}
