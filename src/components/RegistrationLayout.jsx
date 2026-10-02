import { Info } from "lucide-react";

export function Field({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function InfoBox({ title, children }) {
  return (
    <div className="info-box">
      <Info size={18} />
      <span>
        <strong>{title}</strong>
        <p>{children}</p>
      </span>
    </div>
  );
}

const STEPS = [
  "Client details",
  "Intake form",
  "Eligibility review",
  "Complete registration",
];

export function Progress({ step }) {
  const descriptions = [
    "Basic information",
    "Health and experience information",
    "Practitioner checks",
    "Add to class and client record",
  ];

  return (
    <aside className="progress-panel">
      <h3>Registration progress</h3>

      {STEPS.map((name, index) => (
        <div
          className={`progress-step ${index + 1 <= step ? "done" : ""}`}
          key={name}
        >
          <i>{index + 1 < step ? "✓" : index + 1}</i>

          <span>
            <strong>{name}</strong>
            <small>{descriptions[index]}</small>
          </span>
        </div>
      ))}
    </aside>
  );
}

export function RegistrationLayout({
  title,
  subtitle,
  step,
  children,
  back,
  next,
  nextLabel,
  Header,
}) {
  return (
    <main className="registration-page">
      <button className="back-link" onClick={back}>
        ‹ Back to Add New Client
      </button>

      <Header title={title} subtitle={subtitle} />

      <div className="registration-grid">
        <section className="form-card">{children}</section>

        <Progress step={step} />
      </div>

      <div className="registration-actions">
        <button className="secondary-button" onClick={back}>
          ← Back
        </button>

        <button className="primary-button" onClick={next}>
          {nextLabel} →
        </button>
      </div>
    </main>
  );
}
