import { Textarea, Label } from "energycurve";

function Stage({ children, style }: any) {
  return (
    <div style={{ background: "var(--ec-bg)", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", fontFamily: "var(--font-sans)", ...style }}>
      {children}
    </div>
  );
}

export const Default = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Label htmlFor="ta-notes">Set notes</Label>
      <Textarea
        id="ta-notes"
        placeholder="Add notes about this set…"
        style={{ width: 360 }}
      />
    </div>
  </Stage>
);

export const Filled = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Label htmlFor="ta-filled">Set notes</Label>
      <Textarea
        id="ta-filled"
        defaultValue="Warmup runs long — trim two tracks before the first peak. The Afterglow blend at 126 BPM is clean, but the key jump into the closer clashes. Try dropping in a melodic techno bridge in E minor to smooth the energy curve."
        style={{ width: 360, minHeight: 132 }}
      />
    </div>
  </Stage>
);

export const Disabled = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Label htmlFor="ta-disabled">Set notes</Label>
      <Textarea
        id="ta-disabled"
        disabled
        defaultValue="Analysis in progress — notes lock until the energy curve finishes rendering."
        style={{ width: 360 }}
      />
    </div>
  </Stage>
);
