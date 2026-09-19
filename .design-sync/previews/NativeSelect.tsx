import { NativeSelect, Label } from "energycurve";

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
      <Label htmlFor="ns-genre">Set the opening track</Label>
      <NativeSelect id="ns-genre" defaultValue="house" style={{ minWidth: 260 }}>
        <option value="house">House / 124 BPM · A minor</option>
        <option value="techno">Techno / 130 BPM · F minor</option>
        <option value="melodic">Melodic Techno / 122 BPM · C minor</option>
        <option value="dnb">Drum &amp; Bass / 174 BPM · G minor</option>
        <option value="disco">Nu-Disco / 118 BPM · D major</option>
      </NativeSelect>
    </div>
  </Stage>
);

export const WithHint = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Label htmlFor="ns-key">Harmonic mix from</Label>
      <NativeSelect id="ns-key" defaultValue="8a" style={{ minWidth: 260 }}>
        <option value="8a">8A · A minor</option>
        <option value="9a">9A · E minor</option>
        <option value="7a">7A · D minor</option>
        <option value="8b">8B · C major</option>
      </NativeSelect>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ec-text-dim)", lineHeight: 1.5 }}>
        Camelot keys within ±1 blend cleanly with the current track.
      </p>
    </div>
  </Stage>
);

export const Disabled = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Label htmlFor="ns-playlist">Source playlist</Label>
      <NativeSelect id="ns-playlist" disabled defaultValue="synced" style={{ minWidth: 260 }}>
        <option value="synced">Spotify · Friday Warmup (synced)</option>
        <option value="peak">Spotify · Peak Hour</option>
      </NativeSelect>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ec-text-dim)", lineHeight: 1.5 }}>
        Reconnect Spotify to change the source.
      </p>
    </div>
  </Stage>
);
