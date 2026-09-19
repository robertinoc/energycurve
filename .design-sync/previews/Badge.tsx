import { Badge } from "energycurve";

function Stage({ children }: any) {
  return (
    <div
      style={{
        background: "var(--ec-bg)",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}

const Spark = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1l1.8 4.2L14 7l-4.2 1.8L8 13l-1.8-4.2L2 7l4.2-1.8L8 1Z" />
  </svg>
);

export const Variants = () => (
  <Stage>
    <Badge variant="default">Analysis</Badge>
    <Badge variant="outline">Draft</Badge>
    <Badge variant="accent">Cyan</Badge>
    <Badge variant="peak">Peak</Badge>
    <Badge variant="warning">Flat zone</Badge>
    <Badge variant="positive">On track</Badge>
  </Stage>
);

export const DataChips = () => (
  <Stage>
    <Badge variant="accent">128 BPM</Badge>
    <Badge variant="default">A minor</Badge>
    <Badge variant="peak">
      <Spark />
      High energy
    </Badge>
    <Badge variant="warning">−3 dB drop</Badge>
  </Stage>
);
