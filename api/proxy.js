export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint parameter is required' });
  }

  
  const targetUrl = `https://fantasy.premierleague.com/api/${endpoint}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // CRUCIAL: FPL blocks requests without a User-Agent
        'User-Agent': 'FPL-Wrapped-App/1.0', 
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `FPL API Error: ${response.statusText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch data from FPL', details: error.message });
  }
}
