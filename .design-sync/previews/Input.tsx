import { Input, Label } from "energycurve";

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

function Field({ children }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 320 }}>
      {children}
    </div>
  );
}

export const Default = () => (
  <Stage>
    <Field>
      <Label htmlFor="playlist-name">Playlist name</Label>
      <Input id="playlist-name" placeholder="e.g. Friday Warmup" />
    </Field>
  </Stage>
);

export const Filled = () => (
  <Stage>
    <Field>
      <Label htmlFor="set-title">Set title</Label>
      <Input id="set-title" defaultValue="Sunset Terrace — Live at Pier 7" />
    </Field>
  </Stage>
);

export const Invalid = () => (
  <Stage>
    <Field>
      <Label htmlFor="bpm-target">Target BPM</Label>
      <Input id="bpm-target" defaultValue="420" aria-invalid={true} />
      <span style={{ color: "var(--destructive)", fontSize: 13, lineHeight: 1.4 }}>
        Enter a tempo between 60 and 200 BPM.
      </span>
    </Field>
  </Stage>
);

export const Disabled = () => (
  <Stage>
    <Field>
      <Label htmlFor="spotify-link">Spotify link</Label>
      <Input
        id="spotify-link"
        defaultValue="Connect Spotify to import"
        disabled
      />
    </Field>
  </Stage>
);
