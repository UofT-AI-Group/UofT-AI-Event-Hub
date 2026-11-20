import { sampleDailySales, sampleSucceededCount, sampleTicketMix } from "@/lib/sample-data";

// TODO: replace these sample aggregates with synced payment aggregates later.

export function MockCharts() {
  return (
    <section className="charts-section" aria-labelledby="charts-heading">
      <div className="section-heading">
        <div>
          <h2 id="charts-heading">Sales at a glance</h2>
          <p>Fictional sample payments from an illustrative week.</p>
        </div>
        <span className="badge badge-preview">Sample data</span>
      </div>

      <div className="charts-grid">
        <figure className="panel chart-panel">
          <figcaption className="panel-heading">
            <div>
              <h3>Daily sales</h3>
              <p>{sampleSucceededCount} succeeded sample payments in an example week</p>
            </div>
            <span className="badge">Sample only</span>
          </figcaption>
          <div className="daily-chart" role="img" aria-label={`Sample daily payment counts: ${sampleDailySales.map(({ day, count }) => `${day} ${count}`).join(", ")}.`}>
            <div className="chart-scale" aria-hidden="true">
              {[40, 30, 20, 10, 0].map((value) => <span key={value}>{value}</span>)}
            </div>
            <div className="chart-plot" aria-hidden="true">
              <div className="chart-gridlines">{[0, 1, 2, 3, 4].map((line) => <span key={line} />)}</div>
              <div className="chart-bars">
                {sampleDailySales.map(({ day, count }) => (
                  <div className="chart-column" key={day}>
                    <div className="chart-bar" style={{ height: `${count / 40 * 100}%` }}>
                      <span className="bar-value">{count}</span>
                    </div>
                    <span className="bar-label">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="chart-note">Sample data only. Counts include succeeded sample payments.</p>
        </figure>

        <figure className="panel chart-panel">
          <figcaption className="panel-heading">
            <div>
              <h3>Ticket mix</h3>
              <p>Example breakdown of {sampleSucceededCount} succeeded sample payments</p>
            </div>
            <span className="badge">Sample only</span>
          </figcaption>
          <ul className="ticket-mix" aria-label="Sample ticket mix">
            {sampleTicketMix.map(({ label, count, color }) => (
              <li key={label}>
                <div className="mix-label"><span>{label}</span><strong>{count} <span className="muted">/ {count / sampleSucceededCount * 100}%</span></strong></div>
                <div className="mix-track" aria-hidden="true"><div style={{ width: `${count / sampleSucceededCount * 100}%`, backgroundColor: color }} /></div>
              </li>
            ))}
          </ul>
          <p className="chart-note">Sample types and prices only. Conference ticket details are unconfirmed.</p>
        </figure>
      </div>
    </section>
  );
}
