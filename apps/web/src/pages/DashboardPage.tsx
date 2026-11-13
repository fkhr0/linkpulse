import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useOverview } from "../api/hooks";
import { ColumnChart, StatTile } from "../components/charts";
import { Card, ErrorNote, Spinner } from "../components/ui";
import { formatNumber } from "../format";
import { CreateLinkForm } from "../links/CreateLinkForm";

export function DashboardPage() {
  const overview = useOverview();

  if (overview.isPending) return <Spinner />;
  if (overview.error) return <ErrorNote>{overview.error.message}</ErrorNote>;

  const { links, clicks, last7Days, topLinks } = overview.data;
  const week = last7Days.reduce((sum, d) => sum + d.clicks, 0);
  const maxTop = Math.max(1, ...topLinks.map((l) => l.clicks));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Clicks, last 7 days" value={week} />
        <StatTile label="Clicks, all time" value={clicks} />
        <StatTile label="Links" value={links} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-900">Clicks per day</h2>
          <p className="text-sm text-slate-500">All your links, last 7 days</p>
          <div className="mt-4">
            <ColumnChart data={last7Days} label="Clicks per day, all links, last 7 days" />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">Top links</h2>
            <span className="text-sm text-slate-500">30 days</span>
          </div>
          {topLinks.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No clicks yet. Share a link to see it here.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topLinks.map((link) => (
                <li key={link.id}>
                  <Link to={`/links/${link.id}`} className="group block">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-800 group-hover:text-brand-600">
                        {link.title || `/${link.code}`}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-900">{formatNumber(link.clicks)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden>
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${(link.clicks / maxTop) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <Link
            to="/links"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            All links <ArrowRight size={14} aria-hidden />
          </Link>
        </Card>
      </div>

      <CreateLinkForm onCreated={() => overview.refetch()} />
    </div>
  );
}
