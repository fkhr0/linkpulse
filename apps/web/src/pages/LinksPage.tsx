import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { PAGE_SIZE, useDeleteLink, useLinks } from "../api/hooks";
import type { Link } from "../api/types";
import { ConfirmDialog } from "../components/Dialog";
import { QrDialog } from "../components/QrDialog";
import { Button, Card, ErrorNote, Spinner } from "../components/ui";
import { CreateLinkForm } from "../links/CreateLinkForm";
import { LinkRow } from "../links/LinkRow";

export function LinksPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [typed, setTyped] = useState(search);

  // debounce
  useEffect(() => {
    if (typed === search) return;
    const timer = setTimeout(() => setParams(typed ? { q: typed } : {}, { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [typed, search, setParams]);

  const links = useLinks(search, page);
  const remove = useDeleteLink();
  const [qrFor, setQrFor] = useState<Link | null>(null);
  const [toDelete, setToDelete] = useState<Link | null>(null);
  const [created, setCreated] = useState<Link | null>(null);

  const pages = links.data ? Math.max(1, Math.ceil(links.data.total / PAGE_SIZE)) : 1;
  const goTo = (p: number) => setParams({ ...(search && { q: search }), page: String(p) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your links</h1>

      <CreateLinkForm onCreated={setCreated} />
      {created && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Ready: <span className="font-semibold">{created.shortUrl}</span>
        </p>
      )}

      <Card className="p-0">
        <div className="border-b border-slate-200 p-4">
          <label className="relative block">
            <span className="sr-only">Search links</span>
            <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, address or title"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
            />
          </label>
        </div>

        {links.isPending ? (
          <Spinner label="Loading links" />
        ) : links.error ? (
          <div className="p-4">
            <ErrorNote>{links.error.message}</ErrorNote>
          </div>
        ) : links.data.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            {search ? `No links match “${search}”.` : "No links yet. Shorten your first one above."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Links">
            {links.data.items.map((link) => (
              <LinkRow key={link.id} link={link} onQr={setQrFor} onDelete={setToDelete} />
            ))}
          </ul>
        )}

        {links.data && pages > 1 && (
          <nav className="flex items-center justify-between border-t border-slate-200 p-4 text-sm" aria-label="Pages">
            <Button variant="secondary" disabled={page <= 1} onClick={() => goTo(page - 1)}>
              Previous
            </Button>
            <span className="text-slate-600">
              Page {page} of {pages}
            </span>
            <Button variant="secondary" disabled={page >= pages} onClick={() => goTo(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </Card>

      <QrDialog url={qrFor?.shortUrl ?? null} onClose={() => setQrFor(null)} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this link?"
        message={
          <>
            <span className="font-semibold">{toDelete?.shortUrl}</span> will stop working and its click history will be
            deleted. This can't be undone.
          </>
        }
        confirmLabel="Delete link"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </div>
  );
}
