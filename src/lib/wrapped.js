import { fetchBootstrap, fetchHistory, fetchPicks, fetchTransfers, fetchEntry } from "./fpl.js";
import { KMEANS_MODEL, ARCHETYPES } from "./model.js";

const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const normalize = (val, idx) => {
    const min = KMEANS_MODEL.min[idx];
    const max = KMEANS_MODEL.max[idx];
    if (max === min) return 0.5;
    return clamp((val - min) / (max - min), 0, 1);
};

const getDist = (v1, v2) => {
    return Math.sqrt(v1.reduce((acc, val, i) => acc + Math.pow(val - v2[i], 2), 0));
};

export async function buildWrapped(entryId) {
  console.log("[WRAPPED] Starting build for:", entryId);

  try {
    const [history, bootstrap, transfersList, entryDetails] = await Promise.all([
        fetchHistory(entryId), 
        fetchBootstrap(),
        fetchTransfers(entryId),
        fetchEntry(entryId)
    ]);

    const current = history.current || [];
    if (!current.length) throw new Error("No history found.");

    // --- BATCH FETCHING (Optimization) ---
    const gwIds = current.map(x => x.event);
    const picksMap = new Map();
    const liveMap = new Map();

    const batchSize = 5;
    for (let i = 0; i < gwIds.length; i += batchSize) {
        const batch = gwIds.slice(i, i + batchSize);
        await Promise.all(batch.map(async (gw) => {
            try {
                const [p, l] = await Promise.all([fetchPicks(entryId, gw), fetchLive(gw)]);
                if(p) picksMap.set(gw, p);
                if(l) liveMap.set(gw, l);
            } catch (e) { console.warn(`GW${gw} missing`); }
        }));
    }

    const elMap = new Map((bootstrap.elements || []).map((e) => [e.id, e]));
    const getPlayer = (id) => elMap.get(id) || { web_name: "Unknown", selected_by_percent: "0", element_type: 1, team: 0 };

    const getPoints = (gw, playerId) => {
        const live = liveMap.get(gw);
        if (!live || !live.elements) return 0;
        return live.elements.find(x => x.id === playerId)?.stats?.total_points || 0;
    };

    // --- METRIC CALCULATION ---
    let templateSum = 0;
    let startersCount = 0;
    let diffPoints = 0;
    let totalPointsSampled = 0;
    let capRiskSum = 0;
    let benchPoints = 0;

    // Track Max Bench
    let maxBenchVal = -1;
    let maxBenchGW = null;

    gwIds.forEach(gw => {
        const picks = picksMap.get(gw);
        if (!picks) return;

        const live = liveMap.get(gw);
        const stats = live ? new Map(live.elements.map(e=>[e.id, e.stats.total_points])) : new Map();

        let gwTemp = 0;
        let gwStarters = 0;
        let gwBench = 0;

        picks.picks.forEach(p => {
            const el = getPlayer(p.element);
            const pts = (stats.get(p.element) || 0) * p.multiplier;
            const rawPts = (stats.get(p.element) || 0);
            const own = parseFloat(el.selected_by_percent);

            if (p.multiplier > 0) {
                gwTemp += own;
                gwStarters++;
                totalPointsSampled += pts;
                if (own < 10.0) diffPoints += pts;

                if (p.is_captain) {
                   if (own < 20.0) capRiskSum++;
                }
            } else {
                benchPoints += rawPts;
                gwBench += rawPts;
            }
        });

        // Track Max Bench Week
        if (gwBench > maxBenchVal) {
            maxBenchVal = gwBench;
            maxBenchGW = { event: gw, points: gwBench };
        }

        if (gwStarters > 0) templateSum += (gwTemp / gwStarters);
        startersCount++;
    });

    const totalPoints = current[current.length-1].total_points;
    const gwCount = current.length;

    // RAW METRICS
    const rawTemplate = startersCount > 0 ? templateSum / startersCount : 0;
    const rawChurn = current.reduce((a,b)=>a+b.event_transfers, 0) / gwCount;
    const rawHits = current.reduce((a,b)=>a+b.event_transfers_cost, 0) / (4 * gwCount);
    const rawDiff = totalPointsSampled > 0 ? diffPoints / totalPointsSampled : 0;
    const rawRisk = startersCount > 0 ? capRiskSum / startersCount : 0;
    const rawBench = (totalPoints + benchPoints) > 0 ? benchPoints / (totalPoints + benchPoints) : 0;

    // --- CLUSTERING ---
    const userVector = [
        normalize(rawTemplate, 0),
        normalize(rawChurn, 1),
        normalize(rawHits, 2),
        normalize(rawDiff, 3),
        normalize(rawRisk, 4),
        normalize(rawBench, 5)
    ];

    let minDist = Infinity;
    let clusterIdx = 0;

    KMEANS_MODEL.centroids.forEach((centroid, i) => {
        const d = getDist(userVector, centroid);
        if (d < minDist) {
            minDist = d;
            clusterIdx = i;
        }
    });

    const identity = ARCHETYPES[clusterIdx] || ARCHETYPES[9];

    // --- DATA PREP FOR SLIDES ---

    // Best/Worst
    const sortedGWs = [...current].sort((a, b) => b.points - a.points);
    const bestGW = sortedGWs[0];
    const worstGW = sortedGWs[sortedGWs.length - 1];

        // --- TOP 3 RANK JUMP GWs (Percentage Improvement) ---
    const topRankGWs = [];
    current.forEach((h, idx) => {
        if (idx === 0) return;
        const prevRank = current[idx - 1].overall_rank;
        const currRank = h.overall_rank;
        
        if (prevRank <= currRank) return; // Red/Grey Arrow

        // METRIC: Percentage Rank Improvement (0.5 = halved your rank)
        const improvement = (prevRank - currRank) / prevRank;

        // Filter out tiny improvements (noise) if needed, e.g. < 5%
        if (improvement > 0.05) {
             topRankGWs.push({ 
                event: h.event, 
                rankDelta: prevRank - currRank, 
                points: h.points, 
                rank: currRank,
                score: improvement 
            });
        }
    });

    // Sort by Percentage Improvement
    topRankGWs.sort((a, b) => b.score - a.score); 

    const bestRankGW = topRankGWs[0] || { event: 0, rankDelta: 0, points: 0, rank: 0 };


    // --- BEST RANK GW DIFFERENTIALS ---
    const bestRankDifferentials = [];
    if (bestRankGW.event && liveMap.has(bestRankGW.event)) {
        const live = liveMap.get(bestRankGW.event);
        const statsMap = new Map(live.elements.map(e => [e.id, e.stats.total_points])); 
        const picks = picksMap.get(bestRankGW.event);

        if (picks) {
            bestRankDifferentials.push(...picks.picks
                .filter(p => p.multiplier > 0) // Starters only
                .map(p => {
                    const rawPoints = statsMap.get(p.element) || 0;
                    const points = rawPoints * p.multiplier;
                    const el = getPlayer(p.element);
                    const owned = parseFloat(el.selected_by_percent || "0");

                    return {
                        name: el.web_name,
                        points: points,
                        owned: owned
                    };
                })
                .filter(p => p.points >= 4) // CRITICAL FIX: Only show players who returned
                .sort((a, b) => a.owned - b.owned) // Lowest owned first
                .slice(0, 3));
        }
    }

    // --- BENCH DETAILS (WORST BENCH WEEK) ---
    const benchWeak = {
        event: maxBenchGW?.event || 0,
        players: [],
        total: maxBenchGW?.points || 0
    };

    if (benchWeak.event && picksMap.has(benchWeak.event) && liveMap.has(benchWeak.event)) {
        const picks = picksMap.get(benchWeak.event);
        const live = liveMap.get(benchWeak.event);
        const statsMap = new Map(live.elements.map(e => [e.id, e.stats.total_points]));

        // Find bench players (multiplier = 0)
        benchWeak.players = picks.picks
            .filter(p => p.multiplier === 0)
            .map(p => ({
                name: getPlayer(p.element).web_name,
                points: statsMap.get(p.element) || 0
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 3);
    }

    // Chips (Rank Delta Fix)
    const chipsData = (history.chips || []).map(c => {
        const currEntry = current.find(x => x.event === c.event);
        const prevEntry = current.find(x => x.event === c.event - 1);

        let rDelta = 0;
        if (currEntry && prevEntry) {
            rDelta = prevEntry.overall_rank - currEntry.overall_rank;
        }

        return {
            name: c.name === "3xc" ? "Triple Captain" : c.name,
            gw: c.event,
            points: currEntry?.points || 0,
            rankDelta: rDelta
        };
    });

    // Best Transfers
    const uniqueTransfers = new Set();
    const bestTransfers = transfersList.map(t => {
        const key = `${t.event}-${t.element_in}`;
        if (uniqueTransfers.has(key)) return null;
        uniqueTransfers.add(key);
        const picks = picksMap.get(t.event);
        const pick = picks?.picks.find(p => p.element === t.element_in);
        if (!pick || pick.multiplier === 0) return null;
        const p = getPlayer(t.element_in);
        const pts = getPoints(t.event, t.element_in) * pick.multiplier;
        return { name: p.web_name, gw: t.event, points: pts };
    }).filter(t => t && t.points >= 4).sort((a,b)=>b.points-a.points).slice(0, 3);

    // --- CAPTAIN STATS (WITH BONUS POINTS) ---
    const capStats = new Map();
    gwIds.forEach(gw => {
        const p = picksMap.get(gw);
        if(!p) return;
        const cap = p.picks.find(x => x.is_captain);
        if(cap) {
            const basePoints = getPoints(gw, cap.element);
            const bonusPoints = basePoints; // Captain multiplier is 2x, so bonus = base points

            if(!capStats.has(cap.element)) {
                capStats.set(cap.element, {
                    name: getPlayer(cap.element).web_name, 
                    times: 0, 
                    bonusPoints: 0
                });
            }
            const c = capStats.get(cap.element);
            c.times++;
            c.bonusPoints += bonusPoints;
        }
    });
    const topCaps = [...capStats.values()].sort((a, b) => b.bonusPoints - a.bonusPoints).slice(0, 5);

    // --- AGGREGATE SQUAD POINTS ---
    const playerTotalPoints = new Map();
    const playerMeta = new Map();

    gwIds.forEach(gw => {
        const picks = picksMap.get(gw);
        const live = liveMap.get(gw);
        if (!picks || !live) return;

        const stats = new Map(live.elements.map(e => [e.id, e.stats.total_points]));

        picks.picks.forEach(p => {
            const pts = (stats.get(p.element) || 0) * p.multiplier;
            const current = playerTotalPoints.get(p.element) || 0;
            playerTotalPoints.set(p.element, current + pts);

            if (!playerMeta.has(p.element)) {
                const el = getPlayer(p.element);
                playerMeta.set(p.element, {
                    id: p.element,
                    name: el.web_name,
                    pos: el.element_type,
                    team: el.team
                });
            }
        });
    });

    const topSquad = [...playerTotalPoints.entries()]
        .map(([id, points]) => ({ ...playerMeta.get(id), points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 15);

    // --- ARCHETYPE KEY STATS ---
    const archetypeStats = {
        transferActivity: (userVector[1] * 100).toFixed(0),
        riskScore: (userVector[4] * 100).toFixed(0),
        differentialReliance: (userVector[3] * 100).toFixed(0),
        benchEfficiency: ((1 - userVector[5]) * 100).toFixed(0)
    };

    return {
      entryId,
      details: {
          player: entryDetails.player_first_name + " " + entryDetails.player_last_name,
          team: entryDetails.name,
          region: entryDetails.player_region_name
      },
      meta: {
        totalPoints: current[current.length-1].total_points,
        rank: current[current.length-1].overall_rank,
        greenArrows: current.filter((x,i) => i>0 && x.overall_rank < current[i-1].overall_rank).length,
        redArrows: current.filter((x,i) => i>0 && x.overall_rank > current[i-1].overall_rank).length,
      },
      story: {
        best: { gw: bestGW.event, points: bestGW.points },
        worst: { gw: worstGW.event, points: worstGW.points },
        bestRankGW: bestRankGW,
        topRankGWs: topRankGWs.slice(0, 3), // Top 3 green arrow GWs
        bestRankDifferentials: bestRankDifferentials,
        bench: { 
            total: benchPoints, 
            max: maxBenchGW,
            weak: benchWeak
        },
        transfers: { total: Math.round(rawChurn * gwCount), best: bestTransfers },
        chips: chipsData,
        captains: topCaps,
        squad: topSquad,
        archetypeStats: archetypeStats,
        style: {
          archetype: identity.name,
          archetypeDesc: identity.desc,
          soul: identity.color,
          fingerprint: [ 
             [140 + 100 * userVector[0] * Math.cos(0), 140 + 100 * userVector[0] * Math.sin(0)],
             [140 + 100 * userVector[1] * Math.cos(1), 140 + 100 * userVector[1] * Math.sin(1)],
             [140 + 100 * userVector[2] * Math.cos(2), 140 + 100 * userVector[2] * Math.sin(2)],
             [140 + 100 * userVector[3] * Math.cos(3), 140 + 100 * userVector[3] * Math.sin(3)],
             [140 + 100 * userVector[4] * Math.cos(4), 140 + 100 * userVector[4] * Math.sin(4)],
             [140 + 100 * userVector[5] * Math.cos(5), 140 + 100 * userVector[5] * Math.sin(5)]
          ],
          genome: { 
              template: userVector[0],
              churn: userVector[1],
              hits: userVector[2],
              diff: userVector[3],
              risk: userVector[4],
              bench: userVector[5]
          }
        }
      },
      series: { ranks: current.map(x=>x.overall_rank) }
    };

  } catch (e) {
      console.error("[WRAPPED] Error:", e);
      throw e;
  }
}

async function fetchLive(gw) {
  try {
    const res = await fetch(`/api/event/${gw}/live/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) { return null; }
}