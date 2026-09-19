import { Separator } from "energycurve";

function Stage({ children, style }: any) {
  return (
    <div style={{ background: "var(--ec-bg)", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", fontFamily: "var(--font-sans)", ...style }}>
      {children}
    </div>
  );
}

export const Horizontal = () => (
  <Stage>
    <div style={{ width: 320, background: "var(--ec-surface)", borderRadius: 12, border: "1px solid var(--ec-border)", padding: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ color: "var(--ec-text)", fontSize: 15, fontWeight: 600 }}>Midnight Drive — Extended Mix</span>
        <span style={{ color: "var(--ec-text-muted)", fontSize: 13 }}>128 BPM · A minor · 3:48</span>
      </div>
      <div style={{ margin: "16px 0" }}>
        <Separator />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ color: "var(--ec-text)", fontSize: 15, fontWeight: 600 }}>Next: Afterglow</span>
        <span style={{ color: "var(--ec-text-muted)", fontSize: 13 }}>126 BPM · E minor · 4:12</span>
      </div>
    </div>
  </Stage>
);

export const Vertical = () => (
  <Stage>
    <div style={{ background: "var(--ec-surface)", borderRadius: 12, border: "1px solid var(--ec-border)", padding: "12px 20px" }}>
      <div style={{ display: "flex", height: 24, alignItems: "center", gap: 16, color: "var(--ec-text-muted)", fontSize: 13 }}>
        <span>72 tracks</span>
        <Separator orientation="vertical" />
        <span>3h 48m</span>
        <Separator orientation="vertical" />
        <span style={{ color: "var(--ec-cyan)" }}>2 peaks</span>
        <Separator orientation="vertical" />
        <span>128 BPM avg</span>
      </div>
    </div>
  </Stage>
);
