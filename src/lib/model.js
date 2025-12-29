export const KMEANS_MODEL = {
  "centroids": [
    [0.748, 0.313, 0.061, 0.224, 0.548, 0.664], 
    [0.778, 0.305, 0.040, 0.205, 0.250, 0.660], 
    [0.307, 0.065, 0.001, 0.554, 0.219, 0.424], 
    [0.205, 0.047, 0.009, 0.615, 0.989, 0.558], 
    [0.695, 0.576, 0.406, 0.276, 0.568, 0.745], 
    [0.588, 0.175, 0.015, 0.354, 0.452, 0.638], 
    [0.706, 0.155, 0.022, 0.200, 0.018, 0.247],
    [0.450, 0.450, 0.300, 0.400, 0.500, 0.500], 
    [0.550, 0.250, 0.100, 0.300, 0.300, 0.400], 
    [0.650, 0.350, 0.200, 0.200, 0.400, 0.600]
  ],
  "min": [7.002, 0.0, 0.0, 0.011, 0.0, 0.0],
  "max": [24.761, 3.438, 2.438, 0.728, 1.0, 0.198]
};

// --- ARCHETYPE DEFINITIONS (Mapped to Clusters) ---
export const ARCHETYPES = [
  { name: "The Template Grinder", desc: "You stick to the meta but aren't afraid of hits. A balanced, aggressive approach to staying with the pack.", color: "#3B82F6" }, 
  { name: "The Template Purist", desc: "You trust the crowd implicitly. Low risk, high ownership. You let the template do the heavy lifting.", color: "#10B981" }, 
  { name: "The Hipster", desc: "You actively avoid popular players. Your team is a collection of differentials that nobody else owns.", color: "#8B5CF6" }, 
  { name: "The Maverick", desc: "The wildest of the wild. You captain differentials and ignore ownership completely. High risk, high adrenaline.", color: "#EC4899" }, 
  { name: "The Tinkerer", desc: "You treat players like stocks. High churn, frequent hits, and a squad that changes every week.", color: "#EF4444" }, 
  { name: "The Casual", desc: "A relaxed approach. You make moves, but you don't obsess over every price change or effective ownership stat.", color: "#64748B" }, 
  { name: "The Safe Hands", desc: "Extremely risk-averse. You almost never take hits and always captain the most popular choice.", color: "#059669" },
  { name: "The Strategist", desc: "A balanced manager who mixes template picks with calculated differentials.", color: "#D946EF" }, 
  { name: "The Scout", desc: "You have an eye for talent before it becomes popular, often jumping on bandwagons early.", color: "#F59E0B" }, 
  { name: "The Manager", desc: "A solid, middle-of-the-road style. You play the game well without leaning too hard into any extreme.", color: "#6B7280" }
];
