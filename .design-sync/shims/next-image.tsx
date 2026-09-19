// design-sync shim for `next/image`. The real component drags the whole Next
// runtime (process.env.NEXT_*, ImageConfigContext) into the browser bundle and
// throws `process is not defined` at load. In a design preview a plain <img>
// renders the same pixels. Aliased in via .design-sync/tsconfig.build.json.
import * as React from "react";

type NextImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> & {
  src: string | { src: string };
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  alt?: string;
};

export default function Image({
  src,
  width,
  height,
  fill,
  priority: _priority,
  alt = "",
  style,
  ...rest
}: NextImageProps) {
  const resolved = typeof src === "string" ? src : src?.src;
  const fillStyle: React.CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
    : undefined;
  return (
    <img
      src={resolved}
      width={fill ? undefined : (width as number | undefined)}
      height={fill ? undefined : (height as number | undefined)}
      alt={alt}
      style={{ ...fillStyle, ...style }}
      {...rest}
    />
  );
}
