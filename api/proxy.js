// api/proxy.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint required' });
  }

  // Construct the real FPL URL
  // Example: /api/proxy?endpoint=/entry/123/history/
  const targetUrl = `https://fantasy.premierleague.com/api${endpoint}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'FPL-Wrapped/1.0', // Important! FPL blocks generic agents sometimes
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'FPL API Error' });
    }

    const data = await response.json();
    
    // Cache Control: Cache history for 1 hour (3600s), others for 10 mins
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(500).json({ error: 'Proxy Request Failed' });
  }
}
