import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { useDeleteLink, useLink, useUpdateLink } from "../api/hooks";
import type { Link } from "../api/types";
import { CopyButton } from "../components/CopyButton";
import { ConfirmDialog } from "../components/Dialog";
import { Button, Card, ErrorNote, Field, Spinner } from "../components/ui";
import { LinkStatsPanel } from "../links/LinkStatsPanel";

export function LinkPage() {
  const { id = "" } = useParams();
  const link = useLink(id);

  return (
    <div className="space-y-6">
      <RouterLink to="/links" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} aria-hidden /> All links
      </RouterLink>
      {link.isPending ? (
        <Spinner />
      ) : link.error ? (
        <ErrorNote>{link.error.message}</ErrorNote>
      ) : (
        <EditLink key={link.data.id} link={link.data} />
      )}
    </div>
  );
}

// date input <-> end of that day
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (day: string) => (day ? new Date(`${day}T23:59:59`).toISOString() : null);

function EditLink({ link }: { link: Link }) {
  const update = useUpdateLink(link.id);
  const remove = useDeleteLink();
  const navigate = useNavigate();
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title);
  const [expires, setExpires] = useState(toDateInput(link.expiresAt));
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    update.mutate({ url: url.trim(), title: title.trim(), expiresAt: fromDateInput(expires) }, { onSuccess: () => setSaved(true) });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{link.title || link.code}</h1>
          <a href={link.shortUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            {link.shortUrl}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={link.shortUrl} />
          <Button
            variant="secondary"
            disabled={update.isPending}
            onClick={() => update.mutate({ disabled: !link.disabled })}
            aria-pressed={!link.disabled}
          >
            {link.disabled ? "Turn on" : "Turn off"}
          </Button>
        </div>
      </div>

      {link.disabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This link is off: visitors see a "not available" page and nothing is counted.
        </p>
      )}

      <LinkStatsPanel linkId={link.id} />

      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          <h2 className="text-base font-semibold text-slate-900">Details</h2>
          {update.error && <ErrorNote>{update.error.message}</ErrorNote>}
          {saved && !update.isPending && (
            <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Saved. New clicks go to the new address right away.
            </p>
          )}
          <Field label="Goes to" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Field
              label="Expires (optional)"
              type="date"
              hint="Stops working at the end of this day."
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" className="text-red-600" onClick={() => setConfirming(true)}>
              Delete link
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirming}
        title="Delete this link?"
        message={
          <>
            <span className="font-semibold">{link.shortUrl}</span> will stop working and its click history will be
            deleted. This can't be undone.
          </>
        }
        confirmLabel="Delete link"
        busy={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => remove.mutate(link.id, { onSuccess: () => navigate("/links", { replace: true }) })}
      />
    </>
  );
}
