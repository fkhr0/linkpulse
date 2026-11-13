import { useState, type KeyboardEvent } from "react";
import type { Count, DayCount } from "../api/types";
import { LOCALE } from "../format";

const compact = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat(LOCALE);
const dayLabel = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat(LOCALE, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const parseDay = (date: string) => new Date(`${date}T00:00:00Z`);

export function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900" title={whole.format(value)}>
        {compact.format(value)}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

// round axis max
function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

export function ColumnChart({ data, label }: { data: DayCount[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const top = niceMax(Math.max(0, ...data.map((d) => d.clicks)));
  const ticks = [top, top / 2, 0];
  const current = active === null ? null : data[active];

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => Math.min(data.length - 1, Math.max(0, (i ?? data.length - 1) + (i === null ? 0 : step))));
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d) => (
                <tr key={d.date} className="border-t border-slate-100">
                  <td className="py-1 text-slate-700">{fullDay.format(parseDay(d.date))}</td>
                  <td className="py-1 text-right text-slate-900">{whole.format(d.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`${label}. Use the left and right arrow keys to read each day.`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
        >
          <div className="flex gap-3">
            <div className="flex h-44 flex-col justify-between text-right text-xs tabular-nums text-slate-400" aria-hidden>
              {ticks.map((t) => (
                <span key={t}>
                  {compact.format(t)}
                </span>
              ))}
            </div>
            <div className="relative h-44 flex-1">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-x-0 border-t border-slate-100"
                  style={{ bottom: `${(t / top) * 100}%` }}
                  aria-hidden
                />
              ))}
              <div className="absolute inset-0 flex items-end gap-0.5" onPointerLeave={() => setActive(null)}>
                {data.map((d, i) => (
                  <div
                    key={d.date}
                    className="flex h-full flex-1 cursor-default items-end justify-center"
                    onPointerEnter={() => setActive(i)}
                  >
                    <div
                      className={`w-full max-w-6 rounded-t transition-colors ${
                        active === i ? "bg-brand-700" : "bg-brand-600"
                      }`}
                      style={{ height: d.clicks ? `max(2px, ${(d.clicks / top) * 100}%)` : 0 }}
                    />
                  </div>
                ))}
              </div>
              {current && active !== null && (
                <div
                  role="status"
                  className={`pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-xs text-white shadow ${
                    // stays inside the chart at the edges
                    active < data.length * 0.2 ? "" : active >= data.length * 0.8 ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
                >
                  <div className="text-sm font-semibold tabular-nums">
                    {whole.format(current.clicks)} {current.clicks === 1 ? "click" : "clicks"}
                  </div>
                  <div className="text-slate-300">{fullDay.format(parseDay(current.date))}</div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex justify-between pl-9 text-xs text-slate-400" aria-hidden>
            <span>{data[0] && dayLabel.format(parseDay(data[0].date))}</span>
            {data.length > 2 && <span>{dayLabel.format(parseDay(data[Math.floor(data.length / 2)]!.date))}</span>}
            <span>{data.at(-1) && dayLabel.format(parseDay(data.at(-1)!.date))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const countryName = new Intl.DisplayNames(LOCALE, { type: "region" });
const labelOf = (kind: "country" | "device" | "plain", label: string) => {
  if (kind === "device") return label.charAt(0).toUpperCase() + label.slice(1);
  if (kind !== "country" || label === "Unknown") return label;
  try {
    return countryName.of(label) ?? label;
  } catch {
    return label;
  }
};

export function BarList({
  title,
  items,
  kind = "plain",
}: {
  title: string;
  items: Count[];
  kind?: "country" | "device" | "plain";
}) {
  const total = items.reduce((sum, i) => sum + i.clicks, 0);
  const max = Math.max(1, ...items.map((i) => i.clicks));
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No clicks in this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{labelOf(kind, item.label)}</span>
                <span className="shrink-0 tabular-nums text-slate-900">
                  {whole.format(item.clicks)}{" "}
                  <span className="text-slate-400">{Math.round((item.clicks / total) * 100)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${(item.clicks / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
