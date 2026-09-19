import { Button } from "energycurve";

// Dark brand surface — the app never renders these on white.
function Stage({ children, style }: any) {
  return (
    <div
      style={{
        background: "var(--ec-bg)",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "center",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const ArrowRight = () => (
  <svg data-icon="inline-end" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const Play = () => (
  <svg data-icon="inline-start" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 3.5v9l7-4.5-7-4.5Z" />
  </svg>
);
const Plus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const Variants = () => (
  <Stage>
    <Button variant="default">Analyze my set</Button>
    <Button variant="secondary">Connect Spotify</Button>
    <Button variant="outline">Import tracks</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Delete playlist</Button>
    <Button variant="link">Learn more</Button>
  </Stage>
);

export const Sizes = () => (
  <Stage>
    <Button size="xs">Extra small</Button>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </Stage>
);

export const WithIcons = () => (
  <Stage>
    <Button variant="default">
      <Play />
      Play preview
    </Button>
    <Button variant="secondary">
      Continue
      <ArrowRight />
    </Button>
    <Button variant="outline" size="icon" aria-label="Add">
      <Plus />
    </Button>
  </Stage>
);

export const States = () => (
  <Stage>
    <Button variant="default" disabled>
      Analyzing…
    </Button>
    <Button variant="outline" disabled>
      Unavailable
    </Button>
  </Stage>
);
