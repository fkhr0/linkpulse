import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
      aria-label={copied ? "Copied" : `${label} ${text}`}
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span className="hidden sm:inline">{copied ? "Copied" : label}</span>
    </Button>
  );
}
