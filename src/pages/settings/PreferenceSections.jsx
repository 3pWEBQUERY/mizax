import { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { EyeIcon, MoonIcon, SunIcon, InboxIcon, StarIcon, CommentIcon, SparkIcon } from '../../components/Icons.jsx';
import { Group, Row, Switch } from './ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useI18n, LOCALES, dictionaries, errorText } from '../../lib/i18n.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import { useBlocks, unblock } from '../../lib/blocks.js';
import { profilePath } from '../../lib/links.js';

// Unterseiten: Sprache, Design, Privatsphäre, Benachrichtigungen, blockierte Personen

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

// E-Mail-Benachrichtigungen je Art ein-/ausschalten
export function NotificationsSection() {
  const { t } = useI18n();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const notify = user.notify || {};
  const kinds = [
    ['messages', InboxIcon, t('settings.notifyMessages'), t('settings.notifyMessagesHint')],
    ['reviews', StarIcon, t('settings.notifyReviews'), t('settings.notifyReviewsHint')],
    ['comments', CommentIcon, t('settings.notifyComments'), t('settings.notifyCommentsHint')],
    ...(user.role === 'escort'
      ? []
      : [['suggestions', SparkIcon, t('settings.notifySuggestions'), t('settings.notifySuggestionsHint')]]),
  ];

  async function change(key, on) {
    const next = { ...notify, [key]: on };
    updateUser({ notify: next });
    try {
      const r = await api('/api/me/notifications', { method: 'PUT', body: next });
      updateUser(r.user);
    } catch (err) {
      updateUser({ notify });
      toast(errorText(t, err));
    }
  }

  return (
    <>
      <Group>
        {kinds.map(([key, Icon, label, hint]) => (
          <div key={key} className="settings-row static">
            <span className="settings-icon">
              <Icon width={19} height={19} />
            </span>
            <span className="settings-label">
              {label}
              <small>{hint}</small>
            </span>
            <Switch on={notify[key] !== false} onChange={(v) => change(key, v)} label={label} />
          </div>
        ))}
      </Group>
      <div className="settings-info">
        <p>{t('settings.notifyInfo')}</p>
      </div>
    </>
  );
}

// Blockierte Personen: Liste mit „Aufheben“
export function BlockedSection() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const { list, loaded } = useBlocks();

  async function remove(b) {
    try {
      await unblock(b.id, user.id);
      toast(t('block.removed', { name: b.name }));
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  return (
    <>
      {loaded && list.length > 0 ? (
        <Group>
          {list.map((b) => (
            <div key={b.id} className="settings-row static blocked-row">
              <Link to={profilePath(b)} className="blocked-who">
                <Avatar name={b.name} thumb={b.thumb} size={36} />
                <span className="settings-label">{b.name}</span>
              </Link>
              <button type="button" className="status-pill" onClick={() => remove(b)}>
                {t('block.unblock')}
              </button>
            </div>
          ))}
        </Group>
      ) : (
        loaded && <div className="settings-info">{t('block.empty')}</div>
      )}
      <div className="settings-info">
        <p>{t('block.info')}</p>
      </div>
    </>
  );
}
