import { useMemo, useRef, useState } from 'react';
import Picker from './Picker.jsx';
import { ChevronDown } from '../Icons.jsx';
import { COUNTRY_CODES, countryName, flag, sortedOptions } from '../../lib/catalog.js';
import { useI18n } from '../../lib/i18n.jsx';

export default function NationalityField({ value, onChange }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const options = useMemo(
    () => sortedOptions(COUNTRY_CODES, (c) => countryName(c, locale)).map((o) => ({ ...o, prefix: flag(o.code) })),
    [locale],
  );
  const isCode = /^[A-Z]{2}$/.test(value || '');

  return (
    <div className="select-wrap">
      <button
        ref={anchor}
        type="button"
        className={`input select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <span className="select-value">
            {isCode && <span className="picker-prefix">{flag(value)}</span>}
            {isCode ? countryName(value, locale) : value}
          </span>
        ) : (
          <span className="select-placeholder">{t('editor.chooseNationality')}</span>
        )}
        <ChevronDown className="select-chevron" />
      </button>
      <Picker
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchor}
        options={options}
        selected={new Set(value ? [value] : [])}
        onPick={(code) => onChange(code)}
      />
    </div>
  );
}
