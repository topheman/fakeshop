/* eslint-disable jsx-a11y/alt-text, @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    "",
  );
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export async function GET() {
  try {
    // Load all icons
    const nextjsIcon = arrayBufferToBase64(
      await fetch(
        new URL("../../../images/icons/Next.js.svg", import.meta.url),
      ).then((res) => res.arrayBuffer()),
    );
    const reactIcon = arrayBufferToBase64(
      await fetch(
        new URL("../../../images/icons/React.svg", import.meta.url),
      ).then((res) => res.arrayBuffer()),
    );
    const typescriptIcon = arrayBufferToBase64(
      await fetch(
        new URL("../../../images/icons/TypeScript.svg", import.meta.url),
      ).then((res) => res.arrayBuffer()),
    );
    const tailwindIcon = arrayBufferToBase64(
      await fetch(
        new URL("../../../images/icons/Tailwind.svg", import.meta.url),
      ).then((res) => res.arrayBuffer()),
    );

    // Load font
    const interFont = await fetch(
      new URL(
        "https://fonts.cdnfonts.com/s/19795/Inter-ExtraBold.woff",
        import.meta.url,
      ),
    ).then((res) => res.arrayBuffer());

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
              zIndex: 10,
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
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <img src={nextjsIcon} width="96" height="96" />
            <img src={reactIcon} width="96" height="96" />
            <img src={typescriptIcon} width="96" height="96" />
            <img src={tailwindIcon} width="96" height="96" />
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              zIndex: 10,
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
                // whiteSpace: "nowrap",
              }}
            >
              <span>
                A demo e-commerce site built with Next.js 15 latest features
              </span>
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
        width: 1200,
        height: 630,
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
  } catch (e: unknown) {
    console.log(`${e instanceof Error ? e.message : "Unknown error"}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
