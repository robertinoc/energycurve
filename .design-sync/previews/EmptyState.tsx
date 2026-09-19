import { EmptyState, Button } from "energycurve";

function Stage({ children, style }: any) {
  return (
    <div
      style={{
        background: "var(--ec-bg)",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: "flex-start",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const DiscIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21" />
  </svg>
);

export const Default = () => (
  <Stage style={{ width: 460 }}>
    <EmptyState
      icon={<DiscIcon />}
      title="No sets analyzed yet"
      description="Import a DJ set or a Spotify playlist and we'll chart its energy curve, tag every BPM shift, and flag the drops before they clear the floor."
      action={<Button>Import a set</Button>}
    />
  </Stage>
);

export const Minimal = () => (
  <Stage style={{ width: 460 }}>
    <EmptyState
      title="No tracks match this BPM range"
      description="Widen the tempo filter to see mixes between 118 and 128 BPM."
    />
  </Stage>
);
