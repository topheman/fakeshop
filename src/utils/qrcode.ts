// inspired by https://github.com/topheman/me/blob/master/src/utils/qrcode.ts

import QRCode from "qrcode";

export async function generateQRCode(url: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 1,
      color: {
        dark: "#900000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H", // Highest error correction level
      rendererOpts: {
        quality: 1,
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error("Error generating QR code:", err);
    return "";
  }
}
