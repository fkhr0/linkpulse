import { BarChart3, Pencil, QrCode, Trash2 } from "lucide-react";
import { Link as RouterLink } from "react-router";
import type { Link } from "../api/types";
import { CopyButton } from "../components/CopyButton";
import { Button } from "../components/ui";
import { formatNumber, LOCALE } from "../format";

const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" });

export function LinkRow({
  link,
  onQr,
  onDelete,
}: {
  link: Link;
  onQr: (link: Link) => void;
  onDelete: (link: Link) => void;
}) {
  const expired = link.expiresAt !== null && new Date(link.expiresAt) <= new Date();
  const status = link.disabled ? "Off" : expired ? "Expired" : null;

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <RouterLink to={`/links/${link.id}`} className="truncate font-semibold text-slate-900 hover:text-brand-600">
            {link.title || link.shortUrl.replace(/^https?:\/\//, "")}
          </RouterLink>
          {status && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {status}
            </span>
          )}
        </div>
        <a href={link.shortUrl} target="_blank" rel="noreferrer" className="block truncate text-sm text-brand-600 hover:underline">
          {link.shortUrl}
        </a>
        <p className="truncate text-sm text-slate-500" title={link.url}>
          {link.url}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1.5" aria-label={`${link.clicks} clicks`}>
          <BarChart3 size={16} aria-hidden className="text-slate-400" />
          <span className="font-semibold text-slate-900">{formatNumber(link.clicks)}</span>
        </span>
        <span className="hidden md:inline">{dateFormat.format(new Date(link.createdAt))}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <CopyButton text={link.shortUrl} />
        <Button variant="ghost" onClick={() => onQr(link)} aria-label={`QR code for ${link.shortUrl}`}>
          <QrCode size={16} aria-hidden />
        </Button>
        <RouterLink
          to={`/links/${link.id}`}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label={`Edit ${link.shortUrl}`}
        >
          <Pencil size={16} aria-hidden />
        </RouterLink>
        <Button variant="ghost" onClick={() => onDelete(link)} aria-label={`Delete ${link.shortUrl}`}>
          <Trash2 size={16} aria-hidden className="text-red-600" />
        </Button>
      </div>
    </li>
  );
}
