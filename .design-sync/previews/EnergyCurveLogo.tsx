import { EnergyCurveLogo } from "energycurve";

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

export const Primary = () => (
  <Stage>
    <EnergyCurveLogo
      kind="horizontal"
      tone="light"
      size="lg"
      caption="Set energy analysis"
    />
  </Stage>
);

export const Mark = () => (
  <Stage>
    <EnergyCurveLogo kind="square" tone="light" size="lg" />
  </Stage>
);

export const Monochrome = () => (
  <Stage>
    <EnergyCurveLogo kind="monochrome" tone="light" size="lg" />
  </Stage>
);

export const Sizes = () => (
  <Stage style={{ gap: 24 }}>
    <EnergyCurveLogo kind="horizontal" tone="light" size="sm" />
    <EnergyCurveLogo kind="horizontal" tone="light" size="md" />
    <EnergyCurveLogo kind="horizontal" tone="light" size="lg" />
  </Stage>
);
