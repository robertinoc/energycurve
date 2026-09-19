import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  Button,
  Badge,
  Separator,
} from "energycurve";

function Stage({ children }: any) {
  return (
    <div
      style={{
        background: "var(--ec-bg)",
        borderRadius: 16,
        padding: 32,
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}

export const Basic = () => (
  <Stage>
    <Card style={{ maxWidth: 380 }}>
      <CardHeader>
        <CardTitle>Set analysis</CardTitle>
        <CardDescription>
          Your last mix, scored on energy flow and transitions.
        </CardDescription>
        <CardAction>
          <Badge variant="accent">New</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, color: "var(--ec-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
          72 tracks · 3h 48m. The curve peaks twice and lands the closer on a
          clean fade — no flat zones over four minutes.
        </p>
      </CardContent>
      <CardFooter style={{ gap: 12 }}>
        <Button variant="default">View report</Button>
        <Button variant="ghost">Dismiss</Button>
      </CardFooter>
    </Card>
  </Stage>
);

export const StatCard = () => (
  <Stage>
    <Card style={{ maxWidth: 320 }}>
      <CardHeader>
        <CardDescription>Average energy</CardDescription>
        <CardTitle style={{ fontSize: 34 }}>
          <span className="ec-gradient-text">7.8</span>
          <span style={{ fontSize: 15, color: "var(--ec-text-dim)", fontWeight: 400 }}> / 10</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Separator />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Badge variant="positive">+12% vs last set</Badge>
          <Badge variant="peak">2 peaks</Badge>
        </div>
      </CardContent>
    </Card>
  </Stage>
);
