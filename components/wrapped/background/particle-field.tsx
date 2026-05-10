const PARTICLES = Array.from({ length: 14 }).map((_, i) => {
  const seed = i * 9301 + 49297;
  const x = (seed % 100) / 100;
  const y = ((seed * 7) % 100) / 100;
  const delay = ((seed * 3) % 6000) / 1000;
  const duration = 4 + ((seed * 5) % 4000) / 1000;
  const size = 2 + ((seed * 11) % 3);
  return { x, y, delay, duration, size };
});

export function ParticleField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="wrapped-particle"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
    </div>
  );
}
