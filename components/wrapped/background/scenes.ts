export type WrappedScene = {
  base: string;
  blobs: [string, string, string];
  motif: "blobs" | "blobs+particles";
};

export const SCENES: WrappedScene[] = [
  {
    base: "#3b1f8a",
    blobs: ["#6d28d9", "#db2777", "#4338ca"],
    motif: "blobs+particles"
  },
  {
    base: "#0f4c4a",
    blobs: ["#10b981", "#0891b2", "#0e7490"],
    motif: "blobs"
  },
  {
    base: "#7c2d12",
    blobs: ["#f59e0b", "#ea580c", "#e11d48"],
    motif: "blobs"
  },
  {
    base: "#1e1b4b",
    blobs: ["#312e81", "#4c1d95", "#0f172a"],
    motif: "blobs"
  },
  {
    base: "#831843",
    blobs: ["#c026d3", "#f43f5e", "#ea580c"],
    motif: "blobs"
  },
  {
    base: "#0c4a6e",
    blobs: ["#0284c7", "#1d4ed8", "#4338ca"],
    motif: "blobs"
  },
  {
    base: "#881337",
    blobs: ["#e11d48", "#db2777", "#c026d3"],
    motif: "blobs+particles"
  }
];
