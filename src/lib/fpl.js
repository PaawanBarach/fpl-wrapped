const PROXY_URL = "/api/proxy?endpoint="; 

const mem = new Map();
const TTL_MS = 60 * 60 * 1000;

function get(key) {
  const v = mem.get(key);
  if (!v) return null;
  if (Date.now() - v.t > TTL_MS) return mem.delete(key), null;
  return v.d;
}

function set(key, d) {
  mem.set(key, { d, t: Date.now() });
  return d;
}

async function j(targetEndpoint) {
  // We encode the target endpoint so it passes safely as a query param
  const url = `${PROXY_URL}${encodeURIComponent(targetEndpoint)}`;
  
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FPL fetch failed: ${r.status}`);
  return r.json();
}

export async function fetchHistory(entryId) {
  const k = `h:${entryId}`;
  return get(k) || set(k, await j(`/entry/${entryId}/history/`));
}

export async function fetchBootstrap() {
  const k = `b:static`;
  return get(k) || set(k, await j(`/bootstrap-static/`));
}

export async function fetchPicks(entryId, gw) {
  const k = `p:${entryId}:${gw}`;
  return get(k) || set(k, await j(`/entry/${entryId}/event/${gw}/picks/`));
}

export async function fetchTransfers(entryId) {
  const k = `t:${entryId}`;
  return get(k) || set(k, await j(`/entry/${entryId}/transfers/`)); 
}

export async function fetchEntry(id) {
  const k = `e:${id}`;
  return get(k) || set(k, await j(`/entry/${id}/`));
}

export async function fetchLeague(leagueId) {
    const k = `l:${leagueId}`;
    try {
        // Use cached result if available
        const cached = get(k);
        if (cached) return cached;

        const data = await j(`/leagues-classic/${leagueId}/standings/`);
        const results = data.standings.results;
        return set(k, results);
    } catch (e) {
        console.error(e);
        return [];
    }
}
