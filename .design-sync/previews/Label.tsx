import { Label, Input, NativeSelect } from "energycurve";

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

export const WithInput = () => (
  <Stage>
    <Field>
      <Label htmlFor="playlist-name">Playlist name</Label>
      <Input id="playlist-name" placeholder="e.g. Midnight Drive" />
    </Field>
  </Stage>
);

export const WithSelect = () => (
  <Stage>
    <Field>
      <Label htmlFor="genre">Genre</Label>
      <NativeSelect id="genre" defaultValue="house">
        <option value="house">House</option>
        <option value="techno">Techno</option>
        <option value="dnb">Drum &amp; Bass</option>
        <option value="disco">Nu-Disco</option>
      </NativeSelect>
    </Field>
  </Stage>
);
