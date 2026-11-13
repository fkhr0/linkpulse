import { useState } from "react";
import { useLinkStats } from "../api/hooks";
import { BarList, ColumnChart, StatTile } from "../components/charts";
import { Card, ErrorNote, Spinner } from "../components/ui";

const PERIODS = [7, 30, 90] as const;

export function LinkStatsPanel({ linkId }: { linkId: string }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const stats = useLinkStats(linkId, days);

  return (
    <section className="space-y-4" aria-labelledby="stats-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="stats-title" className="text-lg font-semibold text-slate-900">
          Clicks
        </h2>
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-lg bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={days === p}
              onClick={() => setDays(p)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                days === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {stats.isPending ? (
        <Spinner label="Loading clicks" />
      ) : stats.error ? (
        <ErrorNote>{stats.error.message}</ErrorNote>
      ) : (
        <div className={`space-y-4 transition-opacity ${stats.isPlaceholderData ? "opacity-60" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile label={`Clicks, last ${days} days`} value={stats.data.inPeriod} />
            <StatTile label="Clicks, all time" value={stats.data.total} />
          </div>
          <Card>
            <h3 className="text-sm font-semibold text-slate-900">Per day</h3>
            <div className="mt-3">
              <ColumnChart data={stats.data.byDay} label={`Clicks per day, last ${days} days`} />
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <BarList title="Where they came from" items={stats.data.referrers} />
            </Card>
            <Card>
              <BarList title="Countries" items={stats.data.countries} kind="country" />
            </Card>
            <Card>
              <BarList title="Devices" items={stats.data.devices} kind="device" />
            </Card>
            <Card>
              <BarList title="Browsers" items={stats.data.browsers} />
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
