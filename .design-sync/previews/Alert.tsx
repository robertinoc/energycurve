import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
  Button,
} from "energycurve";

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

const WaveIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8h2l2-5 3 11 2.5-8L15 8" />
  </svg>
);

const AlertTriangle = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.2 1.3 13.5h13.4L8 2.2Z" />
    <path d="M8 6.4v3.2" />
    <path d="M8 11.9h.01" />
  </svg>
);

const SpotifyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="8" cy="8" r="6.4" />
    <path d="M4.4 6.3c2.4-.7 5-.4 7 .9" />
    <path d="M4.8 8.6c1.9-.5 3.9-.3 5.6.8" />
    <path d="M5.2 10.7c1.4-.4 2.8-.2 4 .6" />
  </svg>
);

export const Default = () => (
  <Stage>
    <Alert style={{ maxWidth: 440 }}>
      <WaveIcon />
      <AlertTitle>Energy curve ready</AlertTitle>
      <AlertDescription>
        We analyzed all 72 tracks in "Friday Warmup." The set peaks around the
        128 BPM mark and stays above 7/10 for the final 20 minutes.
      </AlertDescription>
    </Alert>
  </Stage>
);

export const Destructive = () => (
  <Stage>
    <Alert variant="destructive" style={{ maxWidth: 440 }}>
      <AlertTriangle />
      <AlertTitle>Energy drop detected</AlertTitle>
      <AlertDescription>
        Tracks 14–17 fall below 3/10 for over four minutes. That flat zone in
        the middle of your mix will likely clear the floor.
      </AlertDescription>
    </Alert>
  </Stage>
);

export const WithAction = () => (
  <Stage>
    <Alert style={{ maxWidth: 440 }}>
      <SpotifyIcon />
      <AlertTitle>Spotify playlist synced</AlertTitle>
      <AlertDescription>
        "Sunset Terrace" now mirrors your latest set. New tracks are matched by
        BPM and key so the transitions stay smooth.
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="sm">
          Undo
        </Button>
      </AlertAction>
    </Alert>
  </Stage>
);
