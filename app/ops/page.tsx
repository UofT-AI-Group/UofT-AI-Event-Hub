import { redirect } from "next/navigation";
import { isOpsAuthenticated } from "@/lib/ops-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import { getAttendees } from "@/lib/attendees";
import type { Attendee } from "@/lib/attendee-types";
import { logout } from "@/app/ops/actions";
import { MockCharts } from "@/app/ops/mock-charts";
import { sampleAttendees } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

function money(cents: number, currency: string | null) {
  return `${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || "(currency unknown)"}`;
}

export default async function Ops() {
  if (!await isOpsAuthenticated()) redirect("/ops/login");
  const configured = hasSupabaseConfig();
  const sample = !configured;
  let rows: Attendee[] = sample ? sampleAttendees : [];
  let failed = false;
  if (configured) {
    try { rows = await getAttendees(); } catch { failed = true; }
  }
  const available = sample || (configured && !failed);
  const succeeded = rows.filter((row) => row.status === "succeeded");
  const revenue = new Map<string, number>();
  const ticketTypes = new Map<string, number>();
  for (const row of succeeded) {
    const type = row.ticket_type || "Unknown";
    ticketTypes.set(type, (ticketTypes.get(type) ?? 0) + 1);
    if (row.amount_cents !== null) {
      const currency = row.currency || "";
      revenue.set(currency, (revenue.get(currency) ?? 0) + row.amount_cents);
    }
  }
  const recent = [...rows].sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at)).slice(0, 50);
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to overview</a>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">AI</span>
            <div><strong>UofT AI</strong><span className="brand-caption">ConferenceX</span></div>
          </div>
          <nav className="topbar-actions" aria-label="Ops actions">
            <span className="workspace-label">{sample ? "Sample workspace" : "Internal workspace"}</span>
            <form action={logout}><button className="button button-quiet" type="submit">Sign out</button></form>
          </nav>
        </div>
      </header>

      <main className="dashboard" id="main-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ConferenceX / Operations</p>
            <h1>Conf X Ops</h1>
            <p className="page-description">Your team&apos;s registration and sales overview.</p>
          </div>
          <div className="export-control">
            {/* TODO: enable the existing export route after testing real synced data. */}
            <button className="button button-export" type="button" disabled aria-describedby="export-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Export CSV
              <span className="button-tag">Coming soon</span>
            </button>
            <span id="export-note">CSV download still needs to be connected.</span>
          </div>
        </div>

        {sample && <div className="notice notice-info">
          <span className="notice-icon" aria-hidden="true">i</span>
          <div><strong>Sample data preview — all data shown is fictional</strong><p>Totals, charts, buyer details and sales are sample data for the UI. Ticket types, prices and dates are illustrative and unconfirmed. Live syncing is not connected yet.</p></div>
        </div>}
        {failed && <div className="notice notice-error" role="alert"><div><strong>Sales data is unavailable</strong><p>Unable to load attendees. Check the Supabase connection and migration, then refresh. The charts below are mock previews.</p></div></div>}

        <section className="overview-section" aria-labelledby="overview-heading">
          <div className="section-heading">
            <h2 id="overview-heading">Overview</h2>
            <span className={`badge ${sample ? "badge-preview" : ""}`}>{sample ? "Sample data" : available ? "Synced data" : "Awaiting data"}</span>
          </div>
          <dl className="metrics-grid">
            <div className="panel metric-card">
              <dt>Succeeded payments</dt>
              <dd>{available ? succeeded.length.toLocaleString("en-CA") : "—"}</dd>
              <p>Completed ticket payment rows</p>
            </div>
            <div className="panel metric-card">
              <dt>Total revenue</dt>
              <dd className="revenue-value">{!available ? "—" : revenue.size ? [...revenue].map(([currency, cents]) => <span key={currency}>{money(cents, currency)}</span>) : "No revenue recorded"}</dd>
              <p>Gross revenue from succeeded payments</p>
            </div>
            <div className="panel metric-card">
              <dt>{sample ? "Sample payment rows" : "Synced payment rows"}</dt>
              <dd>{available ? rows.length.toLocaleString("en-CA") : "—"}</dd>
              <p>All statuses, including refunded payments</p>
            </div>
          </dl>
          <p className="data-note">{sample && "Sample totals only. "}Each row represents a payment, so multi-ticket orders are counted once. Partial refunds are not deducted from gross revenue.</p>
        </section>

        <MockCharts />

        <section className="panel ticket-summary" aria-labelledby="ticket-types">
          <div className="panel-heading">
            <div><h2 id="ticket-types">Ticket type summary</h2><p>{sample ? "Illustrative ticket types and succeeded sample payments" : "Succeeded payment rows from your synced sales"}</p></div>
            <span className={`badge ${sample ? "badge-preview" : ""}`}>{sample ? "Sample data" : "Actual data"}</span>
          </div>
          {failed ? <p className="empty-summary">Ticket counts are temporarily unavailable.</p> : ticketTypes.size ? <ul className="type-counts">{[...ticketTypes].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => <li key={type}><span>{type}</span><strong>{count.toLocaleString("en-CA")}</strong></li>)}</ul> : <p className="empty-summary">No succeeded payments yet. Ticket types will appear after the first sync.</p>}
        </section>

        <section className="panel sales-panel" aria-labelledby="recent">
          <div className="panel-heading">
            <div><h2 id="recent">Recent sales</h2><p>{sample ? "The latest 50 fictional sample payment rows" : "The latest 50 synced payment rows"}</p></div>
            <span className={`badge ${sample ? "badge-preview" : ""}`}>{sample ? `Sample data · ${recent.length} shown` : available ? `${recent.length} shown` : "Awaiting data"}</span>
          </div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Recent sales table">
            <table>
              <thead><tr><th scope="col">Paid at (UTC)</th><th scope="col">Buyer</th><th scope="col">Ticket type</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
              <tbody>{recent.length ? recent.map((row) => <tr key={row.id}>
                <td className="date-cell">{row.paid_at ? new Date(row.paid_at).toISOString().replace("T", " ").replace(".000Z", " UTC") : "—"}</td>
                <td><span className="buyer-name">{row.full_name || "Unnamed buyer"}</span><span className="buyer-email">{row.email || "No email recorded"}</span></td>
                <td>{row.ticket_type || "Unknown"}</td>
                <td className="amount-cell">{row.amount_cents === null ? "Unknown" : money(row.amount_cents, row.currency)}</td>
                <td><span className={`badge ${row.status === "succeeded" ? "badge-success" : ""}`}>{row.status || "Unknown"}</span></td>
              </tr>) : <tr><td colSpan={5} className="empty-cell">
                <div className="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" strokeLinecap="round" /></svg></div>
                <strong>{failed ? "Sales could not be loaded" : "No sales recorded yet"}</strong>
                <p>{failed ? "Refresh after checking your data connection." : "Payments will appear here after Zeffy sync is connected."}</p>
              </td></tr>}</tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-footer"><span>UofT AI · ConferenceX operations</span><span>Tickets, emails and check-in are managed in Zeffy.</span></footer>
      </main>
    </>
  );
}
