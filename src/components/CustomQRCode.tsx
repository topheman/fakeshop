// inspired by https://github.com/topheman/me/blob/master/src/components/CustomQRCode.tsx

import { QrCode } from "lucide-react";

import { generateQRCode } from "@/utils/qrcode";

interface CustomQRCodeProps {
  payload: string;
}

export default async function CustomQRCode({ payload }: CustomQRCodeProps) {
  const qrCodeDataUrl = await generateQRCode(payload);

  return (
    <div className="flex flex-col items-center">
      <div className="size-64 overflow-hidden rounded-xl bg-white p-4 shadow-md transition-shadow duration-300 hover:shadow-lg">
        {qrCodeDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrCodeDataUrl || "/placeholder.svg"}
            alt={`QR Code linking to ${payload}`}
            className="size-full"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gray-100">
            <QrCode className="size-16 text-gray-400" />
          </div>
        )}
      </div>
      <div className="mt-4 text-center">
        <a
          href={payload}
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          {payload.replace(/^https?:\/\//, "")}
        </a>
      </div>
    </div>
  );
}
