import { redirect } from "next/navigation";
import { isOpsAuthenticated } from "@/lib/ops-auth";
import { login } from "@/app/ops/actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isOpsAuthenticated()) redirect("/ops");
  const { error } = await searchParams;
  const configured = Boolean(process.env.OPS_PASSWORD);
  return (
    <main className="login-page">
      <div className="panel login-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">AI</span>
          <div><strong>UofT AI</strong><span className="brand-caption">ConferenceX</span></div>
        </div>
        <h1>Conf X Ops</h1>
        <p className="page-description">Sign in to your team&apos;s workspace.</p>
        {!configured && <div className="notice notice-info"><p>Set OPS_PASSWORD in .env.local and restart the app to enable login. Supabase can be connected later.</p></div>}
        {error === "password" && <p className="login-error" role="alert">Incorrect password. Please try again.</p>}
        <form className="login-form" action={login}>
          <label htmlFor="password">Shared ops password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
          <button className="button button-primary" type="submit" disabled={!configured}>Sign in</button>
        </form>
        <p className="login-footer">Internal access for the ConferenceX team. Registration and tickets are managed in Zeffy.</p>
      </div>
    </main>
  );
}
