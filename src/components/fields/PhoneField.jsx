import { WhatsAppIcon } from '../Icons.jsx';
import { useT } from '../../lib/i18n.jsx';

export const PREFIX = '+41';

// Gespeichert wird "+41 79 123 45 67"; im Feld steht die Vorwahl fest davor.
export function localPart(value = '') {
  return String(value)
    .replace(/^\s*(\+41|0041)\s*/, '')
    .replace(/^0+/, '');
}

export default function PhoneField({ value, onChange, whatsapp = false, id }) {
  const t = useT();
  const local = localPart(value);
  return (
    <label className={`input phone-field ${whatsapp ? 'wa' : ''}`} htmlFor={id}>
      {whatsapp && (
        <span className="wa-logo">
          <WhatsAppIcon size={20} />
        </span>
      )}
      <span className="phone-prefix">{PREFIX}</span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={t('editor.phonePlaceholder')}
        value={local}
        onChange={(e) => {
          const digits = e.target.value
            .replace(/[^\d ]/g, '')
            .replace(/^0+/, '')
            .replace(/\s{2,}/g, ' ');
          onChange(digits.trim() ? `${PREFIX} ${digits.trimStart()}` : '');
        }}
      />
    </label>
  );
}
