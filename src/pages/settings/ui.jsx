import { motion } from 'framer-motion';
import { ChevronR, CheckIcon, SpinnerIcon } from '../../components/Icons.jsx';

// Bausteine der Einstellungen: Gruppen-Karte, Zeile, Schalter, Feld, Speichern-Button

export function Group({ title, children }) {
  return (
    <div className="settings-group">
      {title && <div className="settings-group-title">{title}</div>}
      <div className="settings-card">{children}</div>
    </div>
  );
}

export function Row({ icon: Icon, label, value, onClick, danger, chevron = true, checked, badge, code }) {
  return (
    <button
      type="button"
      className={`settings-row ${danger ? 'danger' : ''} ${Icon ? '' : 'no-icon'}`}
      onClick={onClick}
    >
      {Icon && (
        <span className="settings-icon">
          <Icon width={19} height={19} />
        </span>
      )}
      <span className="settings-label">{label}</span>
      {badge > 0 && <span className="count-badge">{badge}</span>}
      {value && <span className="settings-value">{value}</span>}
      {code && <span className="settings-code">{code}</span>}
      {checked !== undefined ? (
        <span className={`settings-check ${checked ? 'on' : ''}`}>
          {checked && <CheckIcon width={14} height={14} />}
        </span>
      ) : (
        chevron && <ChevronR width={16} height={16} className="settings-chev" />
      )}
    </button>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} className="switch-knob" />
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field settings-field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SaveButton({ busy, children, danger, disabled }) {
  return (
    <button type="submit" className={`white-btn settings-save ${danger ? 'danger' : ''}`} disabled={busy || disabled}>
      {busy && <SpinnerIcon width={18} height={18} className="spin" />}
      {children}
    </button>
  );
}
