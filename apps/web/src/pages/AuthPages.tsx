import { Link2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMe, useSignIn, useSignUp } from "../api/hooks";
import { Button, Card, ErrorNote, Field, Spinner } from "../components/ui";

function AuthFrame({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
            <Link2 aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Short links with live click analytics.</p>
        </div>
        <Card>{children}</Card>
        <p className="text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}

function useAfterSignIn() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const target = from && from !== "/login" && from !== "/signup" ? from : "/";
  return { target, go: () => navigate(target, { replace: true }) };
}

export function LoginPage() {
  const me = useMe();
  const signIn = useSignIn();
  const done = useAfterSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (me.isPending) return <Spinner />;
  if (me.data) return <Navigate to={done.target} replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    signIn.mutate({ email, password }, { onSuccess: done.go });
  }

  return (
    <AuthFrame
      title="Sign in to LinkPulse"
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {signIn.error && <ErrorNote>{signIn.error.message}</ErrorNote>}
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={signIn.isPending}>
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function SignupPage() {
  const me = useMe();
  const signUp = useSignUp();
  const done = useAfterSignIn();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (me.isPending) return <Spinner />;
  if (me.data) return <Navigate to={done.target} replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    signUp.mutate({ name, email, password }, { onSuccess: done.go });
  }

  return (
    <AuthFrame
      title="Create your account"
      footer={
        <>
          Have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {signUp.error && <ErrorNote>{signUp.error.message}</ErrorNote>}
        <Field label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthFrame>
  );
}
