// Bausteine der Profil-Editoren: Abschnitt mit Titel und beschriftetes Feld

export function Section({ title, aside, children }) {
  return (
    <section className="editor-section">
      <div className="panel-title">
        <h2>{title}</h2>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, full, hint, children }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
