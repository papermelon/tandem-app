type Props = {
  colors: [string, string, string];
};

export function FloatingBlobs({ colors }: Props) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="wrapped-blob wrapped-blob-a"
        style={{ background: colors[0] }}
      />
      <div
        className="wrapped-blob wrapped-blob-b"
        style={{ background: colors[1] }}
      />
      <div
        className="wrapped-blob wrapped-blob-c"
        style={{ background: colors[2] }}
      />
    </div>
  );
}
