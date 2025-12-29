import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { buildWrapped } from '../lib/wrapped';


const Radar = ({ pts }) => {
  if (!pts || pts.length < 3) return null;
  const path = "M " + pts.map(p => p.join(",")).join(" L ") + " Z";
  return (
    <svg width="280" height="280" viewBox="0 0 280 280" style={{ overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1.0].map(r => (
         <circle key={r} cx="140" cy="140" r={140*0.85*r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}
      <path d={path} fill="rgba(255, 255, 255, 0.2)" stroke="#fff" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" />
      ))}
    </svg>
  );
};


const StatBar = ({ label, val, color }) => (
    <div style={{ marginBottom: 12, width: '100%', textAlign: 'left' }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4, opacity: 0.9 }}>
            <span>{label}</span>
            <span>{Math.round(val * 100)}%</span>
        </div>
        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
            <div style={{ width: `${Math.min(val * 100, 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
        </div>
    </div>
);


const Wrapped = () => {
  const { entryId } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [error, setError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);


  const onReset = () => {
      setDeck(null);
      setError(null);
      navigate('/');
  };


  const handleShare = async () => {
      const shareData = {
          title: 'My FPL Wrapped',
          text: `I'm ${deck.story.style.archetype}! Check out my season stats.`,
          url: window.location.href
      };
      if (navigator.share) {
          try { await navigator.share(shareData); } 
          catch (err) { console.log('Share canceled'); }
      } else {
          navigator.clipboard.writeText(window.location.href);
          alert("Link copied to clipboard!");
      }
  };


  useEffect(() => {
      if (!entryId) return;
      buildWrapped(entryId).then(setDeck).catch(setError);
  }, [entryId]);


  const slidesCount = 10;


  useEffect(() => {
    if (!deck || isPaused || idx >= slidesCount - 1) return;
    const timer = setTimeout(() => setIdx(i => i + 1), 6000);
    return () => clearTimeout(timer);
  }, [idx, deck, isPaused]);


  const next = () => idx < slidesCount - 1 && setIdx(i => i + 1);
  const prev = () => idx > 0 && setIdx(i => i - 1);


  if (error) return (
      <div className="page">
          <div className="card">
              <h2>Error</h2>
              <p>{error.message}</p>
              <button onClick={() => navigate('/')}>Home</button>
          </div>
      </div>
  );

  if (!deck) return (
      <div className="page">
          <div className="card">
              <h2>Loading...</h2>
              <p>Analyzing Season...</p>
          </div>
      </div>
  );


  const g = deck.story.style.genome || {}; 


  const slides = [
    // 1. INTRO
    {
      bg: "#1a1a1a",
      render: () => (
        <div className="slide-fullscreen">
          <h1 className="big">FPL WRAPPED</h1>
          <h2 className="big2">2024/25</h2>
          <div className="card-highlight">
            <div className="sub">{deck.details.team}</div>
            <div className="big2">{deck.details.player}</div>
          </div>
        </div>
      )
    },
    // 2. OVERVIEW
    {
      bg: "#2d3748",
      render: () => (
        <div className="slide-fullscreen">
          <h1>Your Season</h1>
          <div className="big-stat">{deck.meta.rank.toLocaleString()}</div>
          <p className="caption">Overall Rank</p>

          <div className="card-highlight" style={{ width: '100%' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                 <div>
                    <div className="sub">Points</div>
                    <div className="big2">{deck.meta.totalPoints}</div>
                 </div>
                 <div>
                    <div className="sub">Activity</div>
                    <div className="big2">{(g.churn * 100).toFixed(0)}%</div>
                 </div>
             </div>
             <StatBar label="Transfer Activity" val={g.churn || 0.5} color="#48BB78" />
          </div>
        </div>
      )
    },
    // 3. BENCH (RESTORED BENCH EFFICIENCY BAR)
    {
      bg: "#4A5568", 
      render: () => (
        <div className="slide-fullscreen">
          <h1>The Bench</h1>
          <div className="big-stat" style={{ color: "#CBD5E0" }}>{deck.story.bench.weak?.total || 0}</div>
          <p className="caption">Points Left on Bench (GW {deck.story.bench.weak?.event})</p>

          <div className="card-highlight" style={{ width: '100%' }}>
             <StatBar label="Bench Efficiency" val={1 - (g.bench || 0.5)} color="#CBD5E0" />

             {(deck.story.bench.weak?.players || []).length > 0 && (
               <div style={{ marginTop: 20 }}>
                  <div className="sub" style={{ textAlign: 'left', marginBottom: 10 }}>WHO COULD'VE PLAYED</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                     {deck.story.bench.weak.players.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                           <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                           <span style={{ color: '#FC8181', fontWeight: 'bold' }}>{p.points} pts</span>
                        </div>
                     ))}
                  </div>
               </div>
             )}
          </div>
        </div>
      )
    },
    // 4. TRANSFERS
    {
      bg: "#2b6cb0",
      render: () => (
        <div className="slide-fullscreen">
          <h1>Market Moves</h1>
          <div className="big-stat">{deck.story.transfers.total}</div>
          <p className="caption">Total Transfers</p>


          <div className="card-highlight" style={{ width: '100%' }}>
             <StatBar label="Hit Frequency" val={g.hits || 0.5} color="#F56565" />
             <div style={{ marginTop: 20, textAlign: 'left' }}>
                <div className="sub">Best Signing</div>
                {(deck.story.transfers.best || []).slice(0,1).map((t, i) => (
                    <div key={i}>
                       <div className="big2" style={{ color: '#68D391' }}>{t.name}</div>
                       <div className="sub">+{t.points} pts (GW{t.gw})</div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      )
    },
    // 5. CHIPS
    {
      bg: "#805ad5",
      render: () => (
        <div className="slide-fullscreen">
          <h1>Chip Strategy</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 20 }}>
            {(deck.story.chips || []).map((chip, i) => {
               const isGreen = chip.rankDelta > 0;
               const arrow = isGreen ? "▲" : "▼";
               const color = isGreen ? "#68D391" : "#FC8181";

               return (
                  <div key={i} className="card-highlight" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0, padding: 15 }}>
                     <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "bold" }}>{chip.name}</div>
                        <div className="sub">GW {chip.gw}</div>
                     </div>
                     <div style={{ textAlign: "right" }}>
                        <div className="big2" style={{ fontSize: '1.5rem' }}>{chip.points}</div>
                        {chip.rankDelta !== 0 && (
                            <div style={{ color: color, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {arrow} {Math.abs(chip.rankDelta).toLocaleString()}
                            </div>
                        )}
                     </div>
                  </div>
               );
            })}
          </div>
        </div>
      )
    },
    // 6. PEAKS (WITH HONORABLE MENTIONS)
    {
      bg: "#c05621",
      render: () => (
        <div className="slide-fullscreen">
           <h1>Peak Performance</h1>
           <div className="big-stat">{deck.story.bestRankGW?.points || deck.story.best.points}</div>
           <p className="caption">GW {deck.story.bestRankGW?.event || deck.story.best.gw} — Best Rank Jump {deck.story.bestRankGW?.rankDelta ? `(+${deck.story.bestRankGW.rankDelta.toLocaleString()})` : ''}</p>

           {(deck.story.bestRankDifferentials || []).length > 0 && (
              <div style={{ width: '100%', marginTop: 20 }}>
                 <div className="sub" style={{ textAlign: 'left', marginBottom: 10 }}>DIFFERENTIAL WEAPONS</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deck.story.bestRankDifferentials.map((p, i) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                          <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                          <span style={{ color: '#FBD38D', fontWeight: 'bold' }}>{p.points} pts • {p.owned.toFixed(1)}% owned</span>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {(deck.story.topRankGWs || []).length > 1 && (
              <div style={{ width: '100%', marginTop: 20, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                 <div className="sub" style={{ textAlign: 'left', marginBottom: 8, opacity: 0.7 }}>HONORABLE MENTIONS</div>
                 <div style={{ display: 'flex', gap: 10 }}>
                    {deck.story.topRankGWs.slice(1, 3).map((gw, i) => (
                       <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>GW {gw.event}</div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{gw.points} pts</div>
                          <div style={{ fontSize: '0.7rem', color: '#68D391' }}>+{gw.rankDelta.toLocaleString()}</div>
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      )
    },
    // 7. CAPTAINS
    {
      bg: "#B83280",
      render: () => (
         <div className="slide-fullscreen">
            <h1>Captaincy</h1>
            <div className="big-stat">{(deck.story.captains || []).reduce((sum, c) => sum + (c.bonusPoints || 0), 0)}</div>
            <p className="caption">Extra Points via Captain</p>

            <div style={{ width: '100%', marginTop: 30 }}>
               <div className="sub" style={{ textAlign: 'left', marginBottom: 10 }}>TOP CAPTAINS</div>
               {(deck.story.captains || []).slice(0,4).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.name}</span>
                      <div style={{ textAlign: 'right' }}>
                          <div className="big2" style={{ fontSize: '1.2rem' }}>{c.bonusPoints || 0}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.times}x captain</div>
                      </div>
                  </div>
               ))}
            </div>
         </div>
      )
    },
    // 8. DREAM SQUAD
    {
      bg: "#2C5282", 
      render: () => (
        <div className="slide-fullscreen">
           <h1>Your Heroes</h1>
           <p className="caption" style={{marginBottom: 20}}>Top Point Scorers</p>

           <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr 1fr', 
               gap: 10, 
               width: '100%',
               maxWidth: 500
           }}>
              {(deck.story.squad || []).slice(0, 12).map((p, i) => (
                  <div key={i} style={{ 
                      background: i < 3 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.1)', 
                      padding: 8, 
                      borderRadius: 8,
                      border: i < 3 ? '1px solid gold' : 'none',
                      textAlign: 'center'
                  }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{p.pos === 1 ? 'GK' : p.pos === 2 ? 'DEF' : p.pos === 3 ? 'MID' : 'FWD'}</div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: '2px 0' }}>{p.name}</div>
                      <div style={{ fontWeight: '800', color: i < 3 ? '#F6E05E' : '#fff' }}>{p.points}</div>
                  </div>
              ))}
           </div>
        </div>
      )
    },
    // 9. ARCHETYPE
    {
      bg: deck.story.style.soul || "#444", 
      render: () => (
        <div className="slide-fullscreen">
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 16px", borderRadius: 50, marginBottom: 20 }}>
            <span className="sub" style={{ textTransform: "uppercase", fontWeight: "bold", letterSpacing: 2 }}>Your Identity</span>
          </div>
          <h1 className="big" style={{ fontSize: '3.5rem', lineHeight: 1 }}>{deck.story.style.archetype}</h1>
          <div style={{ margin: "20px auto", transform: "scale(1.1)" }}>
             <Radar pts={deck.story.style.fingerprint} />
          </div>

          {deck.story.archetypeStats && (
            <div style={{ width: '100%', marginTop: 20, textAlign: 'left', maxWidth: 400 }}>
               <StatBar label="Transfer Frequency" val={deck.story.archetypeStats.transferActivity / 100} color="#68D391" />
               <StatBar label="Risk Tolerance" val={deck.story.archetypeStats.riskScore / 100} color="#F687B3" />
               <StatBar label="Differential Hunting" val={deck.story.archetypeStats.differentialReliance / 100} color="#FBD38D" />
            </div>
          )}

          <p className="caption" style={{ maxWidth: 400, opacity: 0.9, marginTop: 20 }}>
             {deck.story.style.archetypeDesc}
          </p>
        </div>
      )
    },
    // 10. SUMMARY
    {
      bg: "#000",
      render: () => (
        <div className="slide-fullscreen">
          <h1>SEASON RECAP</h1>
          <div className="card-highlight" style={{ width: '100%', textAlign: 'left', padding: 25 }}>
             <div className="big2" style={{ marginBottom: 5 }}>{deck.details.team}</div>
             <div className="sub" style={{ marginBottom: 20 }}>{deck.details.player}</div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                    <div className="sub">Total Points</div>
                    <div className="big2">{deck.meta.totalPoints}</div>
                </div>
                <div>
                    <div className="sub">Rank</div>
                    <div className="big2" style={{ fontSize: '1.8rem' }}>{deck.meta.rank.toLocaleString()}</div>
                </div>
             </div>
             <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="sub">Archetype</div>
                <div className="big2" style={{ fontSize: '1.5rem', color: deck.story.style.soul }}>{deck.story.style.archetype}</div>
             </div>
          </div>
          <div className="actions" style={{ marginTop: 30, width: '100%' }}>
             <button onClick={handleShare} style={{ width: '100%', padding: 15, fontSize: '1.1rem', background: '#3182CE', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Share Wrapped</button>
             <button onClick={onReset} style={{ width: '100%', padding: 15, fontSize: '1.1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', marginTop: 10, borderRadius: 8, cursor: 'pointer', color: '#fff' }}>Replay</button>
          </div>
        </div>
      )
    }
  ];


  const currentSlide = slides[idx];


  return (
    <div className="story-container" style={{ background: currentSlide.bg }}>
      <div className="bars">
        {slides.map((_, i) => (
           <div key={i} className="bar-bg">
              <div 
                className="bar-fill" 
                style={{ 
                    width: i < idx ? '100%' : (i === idx && !isPaused ? '100%' : '0%'),
                    transition: i === idx && !isPaused ? 'width 6s linear' : 'none'
                }} 
              />
           </div>
        ))}
      </div>


      <div 
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 60, opacity: 0.7, fontSize: '1.5rem', cursor: 'pointer' }}
        onClick={onReset}
      >✕</div>


      <div className="tap-left" onClick={prev} />
      <div className="tap-right" onClick={next} />


      <div 
        className="slide-fullscreen" 
        onMouseDown={() => setIsPaused(true)} 
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <AnimatePresence mode='wait'>
            <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
            {currentSlide.render()}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};


export default Wrapped;