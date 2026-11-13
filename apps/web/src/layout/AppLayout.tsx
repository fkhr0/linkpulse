import { Link2, LogOut } from "lucide-react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useMe, useSignOut } from "../api/hooks";
import { Button, Spinner } from "../components/ui";

export function AppLayout() {
  const me = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();

  if (me.isPending) return <Spinner />;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              <Link2 size={18} aria-hidden />
            </span>
            <span>
              Link<span className="text-brand-600">Pulse</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{me.data.name}</span>
            <Button
              variant="ghost"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate("/login") })}
            >
              <LogOut size={16} aria-hidden /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
