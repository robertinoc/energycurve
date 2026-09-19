import { Toast } from "energycurve";

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

export const Success = () => (
  <Stage style={{ position: "relative", minHeight: 160, width: 420 }}>
    <p style={{ color: "var(--ec-text-muted)", fontSize: 13, margin: 0 }}>
      Syncing "Friday Warmup" to Spotify…
    </p>
    <Toast show={true} message="Playlist saved to Spotify" />
  </Stage>
);
