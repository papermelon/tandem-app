import { FloatingBlobs } from "./floating-blobs";
import { ParticleField } from "./particle-field";
import type { WrappedScene } from "./scenes";

import "./wrapped-background.css";

export function WrappedBackground({ scene }: { scene: WrappedScene }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: scene.base }}
    >
      <FloatingBlobs colors={scene.blobs} />
      {scene.motif === "blobs+particles" ? <ParticleField /> : null}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
    </div>
  );
}
