import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <Link to="/" className="font-semibold text-brand-600 hover:underline">
        Go to the dashboard
      </Link>
    </main>
  );
}
