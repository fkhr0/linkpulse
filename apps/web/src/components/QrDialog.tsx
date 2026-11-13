// A QR code for a short link, ready to print on a poster or a slide.
import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./ui";

export function QrDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  function download() {
    const canvas = box.current?.querySelector("canvas");
    if (!canvas || !url) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${new URL(url).pathname.slice(1) || "link"}-qr.png`;
    a.click();
  }

  return (
    <Dialog open={url !== null} onClose={onClose} title="QR code">
      {url && (
        <>
          <div ref={box} className="flex justify-center rounded-lg bg-white p-4 ring-1 ring-slate-200">
            <QRCodeCanvas value={url} size={220} marginSize={2} title={`QR code for ${url}`} />
          </div>
          <p className="break-all text-center text-sm text-slate-600">{url}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={download}>Download PNG</Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
