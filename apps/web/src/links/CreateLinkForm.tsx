// Paste a long address, optionally choose the short name, get a link.
import { useState, type FormEvent } from "react";
import { useCreateLink } from "../api/hooks";
import type { Link } from "../api/types";
import { Button, Card, ErrorNote, Field } from "../components/ui";

export function CreateLinkForm({ onCreated }: { onCreated: (link: Link) => void }) {
  const create = useCreateLink();
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [title, setTitle] = useState("");
  const [more, setMore] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      { url: url.trim(), alias: alias.trim() || undefined, title: title.trim() || undefined },
      {
        onSuccess: (link) => {
          setUrl("");
          setAlias("");
          setTitle("");
          onCreated(link);
        },
      },
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <h2 className="text-base font-semibold text-slate-900">Shorten a link</h2>
        {create.error && <ErrorNote>{create.error.message}</ErrorNote>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Long address"
              type="url"
              placeholder="https://example.com/a/very/long/path"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={create.isPending || !url.trim()}>
            {create.isPending ? "Shortening…" : "Shorten"}
          </Button>
        </div>
        {more ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Custom name (optional)"
              placeholder="my-cv"
              hint="3–40 letters, digits, - or _"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
            <Field label="Title (optional)" placeholder="My CV" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        ) : (
          <button type="button" className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setMore(true)}>
            + Custom name and title
          </button>
        )}
      </form>
    </Card>
  );
}
