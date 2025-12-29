import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Wrapped from "./pages/Wrapped.jsx";
import Share from "./pages/Share.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wrapped/:entryId" element={<Wrapped />} />
      <Route path="/share/:shareId" element={<Share />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
