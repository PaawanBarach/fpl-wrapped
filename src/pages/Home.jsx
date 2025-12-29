import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeague } from "../lib/fpl";

// ⚠️ REPLACE THIS WITH YOUR FRIEND GROUP'S LEAGUE ID
const DEFAULT_LEAGUE_ID = "1415574"; 

export default function Home() {
  const [query, setQuery] = useState("");
  const [managers, setManagers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const navigate = useNavigate();

  // 1. Silently Fetch League on Mount
  useEffect(() => {
    async function init() {
        if (!DEFAULT_LEAGUE_ID) return;
        const data = await fetchLeague(DEFAULT_LEAGUE_ID);
        setManagers(data);
    }
    init();
  }, []);

  // 2. Filter Logic (Search by Name or Team Name)
  useEffect(() => {
    if (query.length < 2) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFiltered([]);
        return;
    }
    const lower = query.toLowerCase();
    const matches = managers.filter(m => 
        m.player_name.toLowerCase().includes(lower) || 
        m.entry_name.toLowerCase().includes(lower)
    );
    setFiltered(matches.slice(0, 5)); // Limit to 5 suggestions
  }, [query, managers]);

  return (
    <div className="page">
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        
        {/* HERO SECTION */}
        <h1 className="title-glitch" style={{ fontSize: "2.5rem", marginBottom: 10 }}>FPL WRAPPED</h1>
        <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 30 }}>
            Who were you this season?
        </p>

        {/* SEARCH BOX */}
        <div style={{ position: "relative", maxWidth: 400, margin: "0 auto" }}>
            <label style={{ textAlign: "left", marginLeft: 5 }}>Find your team</label>
            <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your name..." 
                type="text"
                style={{ 
                    fontSize: "1.2rem", 
                    padding: "15px", 
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    textAlign: "center"
                }}
            />

            {/* DROPDOWN RESULTS */}
            {filtered.length > 0 && (
                <div style={{ 
                    position: "absolute", 
                    top: "100%", 
                    left: 0, 
                    right: 0, 
                    background: "#1a202c", 
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "0 0 12px 12px",
                    zIndex: 50,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    overflow: "hidden"
                }}>
                    {filtered.map(m => (
                        <div 
                            key={m.entry} 
                            onClick={() => navigate(`/wrapped/${m.entry}`)}
                            style={{ 
                                padding: "15px", 
                                borderBottom: "1px solid rgba(255,255,255,0.05)", 
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                            <span style={{ fontWeight: "bold", color: "#fff" }}>{m.player_name}</span>
                            <span style={{ fontSize: "0.8rem", color: "#a0aec0" }}>{m.entry_name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* FALLBACK FOR MANUAL ID */}
        <div style={{ marginTop: 40, opacity: 0.5, fontSize: "0.8rem" }}>
            <p>Not in the group? <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => {
                const id = prompt("Enter Team ID:");
                if(id) navigate(`/wrapped/${id}`);
            }}>Enter ID manually</span></p>
        </div>

      </div>
    </div>
  );
}
