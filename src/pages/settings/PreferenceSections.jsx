import { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { EyeIcon, MoonIcon, SunIcon } from '../../components/Icons.jsx';
import { Group, Row, Switch } from './ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useI18n, LOCALES, dictionaries, errorText } from '../../lib/i18n.jsx';
import { useTheme } from '../../lib/theme.jsx';

// Unterseiten: Sprache, Design, Privatsphäre

export function LanguageSection() {
  const { locale, setLocale } = useI18n();
  return (
    <Group>
      {LOCALES.map((l) => (
        <Row
          key={l}
          label={dictionaries[l].langName}
          code={l.toUpperCase()}
          checked={locale === l}
          onClick={() => setLocale(l)}
        />
      ))}
    </Group>
  );
}

export function ThemeSection() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <Group>
      <Row icon={MoonIcon} label={t('menu.dark')} checked={theme === 'dark'} onClick={() => setTheme('dark')} />
      <Row icon={SunIcon} label={t('menu.light')} checked={theme === 'light'} onClick={() => setTheme('light')} />
    </Group>
  );
}

export function PrivacySection() {
  const { t } = useI18n();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function change(showVisits) {
    setBusy(true);
    updateUser({ showVisits });
    try {
      const r = await api('/api/me/privacy', { method: 'PUT', body: { showVisits } });
      updateUser(r.user);
    } catch (err) {
      updateUser({ showVisits: !showVisits });
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Group>
        <div className="settings-row static">
          <span className="settings-icon">
            <EyeIcon width={19} height={19} />
          </span>
          <span className="settings-label">
            {t('settings.showVisits')}
            <small>{user.role === 'escort' ? t('settings.showVisitsEscort') : t('settings.showVisitsMember')}</small>
          </span>
          <Switch on={user.showVisits} onChange={(v) => !busy && change(v)} label={t('settings.showVisits')} />
        </div>
      </Group>
      <div className="settings-info">
        <p>{t('settings.privacyInfo1')}</p>
        <p>{t('settings.privacyInfo2')}</p>
      </div>
    </>
  );
}
