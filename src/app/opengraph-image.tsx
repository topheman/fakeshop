/* eslint-disable jsx-a11y/alt-text */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt =
  "A demo e-commerce site built with Next.js 16 latest features";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function asset(...segments: string[]) {
  return join(process.cwd(), "src", "images", ...segments);
}

async function readSvgAsDataUrl(fileName: string) {
  const svg = await readFile(asset("icons", fileName));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

/**
 * Read at module scope rather than inside `Image()`, so the element tree handed
 * to `ImageResponse` holds no request-time input. That is what lets Cache
 * Components rasterize the image once during the build and serve a static PNG;
 * an uncached read inside the render would make the route dynamic again.
 */
const [nextjsIcon, reactIcon, typescriptIcon, tailwindIcon, interFont] =
  await Promise.all([
    readSvgAsDataUrl("Next.js.svg"),
    readSvgAsDataUrl("React.svg"),
    readSvgAsDataUrl("TypeScript.svg"),
    readSvgAsDataUrl("Tailwind.svg"),
    readFile(asset("fonts", "Inter-ExtraBold.ttf")),
  ]);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          position: "relative",
          fontFamily: "Inter",
          padding: "60px",
        }}
      >
        {/* Username signature */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            color: "#900000",
            fontSize: 60,
            fontWeight: 800,
          }}
        >
          @topheman
        </div>

        {/* Technology Icons */}
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <img src={nextjsIcon} width={96} height={96} />
          <img src={reactIcon} width={96} height={96} />
          <img src={typescriptIcon} width={96} height={96} />
          <img src={tailwindIcon} width={96} height={96} />
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            flex: 1,
            maxWidth: "900px",
            marginLeft: "-100px",
          }}
        >
          <h1
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#333333",
              margin: "30px 0",
              lineHeight: 1.2,
            }}
          >
            FakeShop
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 48,
              color: "#900000",
              margin: "0 0 50px 0",
              fontWeight: 600,
            }}
          >
            <span>{alt}</span>
          </div>

          {/* Features as a horizontal line */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              color: "#666666",
              fontSize: 32,
              opacity: 0.9,
            }}
          >
            <span>Server Components</span>
            <span style={{ color: "#900000" }}>•</span>
            <span>Server Actions</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              color: "#666666",
              fontSize: 32,
              opacity: 0.9,
            }}
          >
            <span>Progressive Enhancement</span>
            <span style={{ color: "#900000" }}>•</span>
            <span>Streaming</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: interFont,
          weight: 800,
          style: "normal",
        },
      ],
    },
  );
}
