import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Share() {
  const { shareId } = useParams();
  const nav = useNavigate();
  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      const { data, error } = await supabase.from("shares").select("payload").eq("id", shareId).single();
      if (!ok) return;
      if (error) return setErr(error.message);
      setPayload(data.payload);
    })();
    return () => { ok = false; };
  }, [shareId]);

  if (err) return <div className="page"><div className="card">{err} <Link to="/">Back</Link></div></div>;
  if (!payload) return <div className="page"><div className="card">Loading shared wrapped…</div></div>;

  // simple redirect: open viewer with entryId, but you could also render from payload directly
  return (
    <div className="page">
      <div className="card">
        <h2>Shared Wrapped</h2>
        <p className="muted">Entry {payload.entryId}</p>
        <button onClick={() => nav(`/wrapped/${payload.entryId}`)}>Open full deck</button>
        <div style={{ marginTop: 10 }}><Link className="link" to="/">Home</Link></div>
      </div>
    </div>
  );
}
