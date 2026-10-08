import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { Placeholder } from '../components/Media.jsx';
import { useToast } from '../components/Toast.jsx';
import ProfileEditor from '../components/ProfileEditor.jsx';
import { SpinnerIcon, PlusIcon } from '../components/Icons.jsx';
import { api, getToken, setToken } from '../lib/api.js';
import { loadEscorts } from '../lib/store.js';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

export default function Admin() {
  useDock({ mode: 'hidden' });
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!authed) return;
    api('/api/admin/status', { admin: true })
      .then(setStatus)
      .catch((err) => {
        if (err.status === 401) {
          setToken('');
          setAuthed(false);
        }
      });
  }, [authed]);

  return (
    <Page>
      <AnimatePresence mode="wait" initial={false}>
        {authed ? (
          <motion.div key="panel" {...fade}>
            <Dashboard
              status={status}
              onLogout={() => {
                setToken('');
                setAuthed(false);
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="login" {...fade}>
            <AdminLogin onDone={() => setAuthed(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

function AdminLogin({ onDone }) {
  const { t } = useI18n();
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/api/admin/login', { method: 'POST', body: { password: pw } });
      setToken(token);
      onDone();
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="bubbles">
        <Bubble i={0}>{t('admin.title')}</Bubble>
        <Bubble i={1}>{t('admin.loginText')}</Bubble>
      </div>
      <Rise i={2} as="form" className="auth-form" onSubmit={submit}>
        <input
          className="auth-input"
          type="password"
          placeholder={t('admin.password')}
          aria-label={t('admin.password')}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <button className="white-btn auth-submit" disabled={busy || !pw}>
          {busy ? <SpinnerIcon /> : t('admin.login')}
        </button>
      </Rise>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
            <div className="bubble auth-error">{error}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dashboard({ status, onLogout }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('profiles');

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">{t('admin.manage')}</h1>
        <div className="status-row">
          {status && (
            <>
              <span className="badge">{status.db ? `● ${t('admin.dbOk')}` : `○ ${t('admin.dbNo')}`}</span>
              <span className="badge">{status.storage ? `● ${t('admin.bucketOk')}` : `○ ${t('admin.bucketNo')}`}</span>
            </>
          )}
          <button className="badge" onClick={onLogout}>
            {t('admin.logout')}
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {[
          ['profiles', t('admin.tabProfiles')],
          ['users', t('admin.tabUsers')],
        ].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {tab === k && <motion.span layoutId="admin-tab" className="chip-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} {...fade} transition={{ duration: 0.2 }}>
          {tab === 'profiles' ? <Profiles status={status} /> : <Users />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function Profiles({ status }) {
  const { t } = useI18n();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null); // id | 'new' | null

  const refresh = useCallback(async () => {
    const rows = await api('/api/admin/escorts', { admin: true });
    setList(rows);
    loadEscorts(true).catch(() => {});
    return rows;
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast(errorText(t, e)));
  }, [refresh, toast, t]);

  const current = selected === 'new' ? null : list?.find((e) => e.id === selected);

  return (
    <div className="admin-grid">
      <div className="panel">
        <button className="menu-item" onClick={() => setSelected('new')} style={{ marginBottom: 6 }}>
          <PlusIcon width={18} height={18} /> {t('admin.newProfile')}
        </button>
        <div className="admin-list">
          {!list && <div className="empty">{t('admin.loading')}</div>}
          {list?.map((e) => (
            <button key={e.id} className={`admin-item ${selected === e.id ? 'active' : ''}`} onClick={() => setSelected(e.id)}>
              <div className="admin-thumb">
                {e.photos[0] ? <img src={e.photos[0].thumb} alt="" /> : <Placeholder escort={e} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {e.name}, {e.age}
                </div>
                <div className="meta">
                  {e.city || '–'} · {t('admin.photosCount', { n: e.photos.length })}
                  {e.published ? '' : ` · ${t('admin.hidden')}`}
                  {e.userId ? ` · ${t('admin.ownProfile')}` : ''}
                </div>
              </div>
            </button>
          ))}
          {list && !list.length && <div className="empty">{t('admin.noProfiles')}</div>}
        </div>
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <ProfileEditor
                mode="admin"
                escort={current}
                storage={status?.storage}
                onSaved={async (e) => {
                  await refresh();
                  setSelected(e.id);
                }}
                onDeleted={async () => {
                  await refresh();
                  setSelected(null);
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="none" className="empty" {...fade}>
              {t('admin.select')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Users() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState(null);

  useEffect(() => {
    api('/api/admin/users', { admin: true })
      .then(setUsers)
      .catch((e) => toast(errorText(t, e)));
  }, [toast, t]);

  const fmt = (d) =>
    d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '–';

  return (
    <div className="panel" style={{ padding: 16 }}>
      {!users ? (
        <div className="empty">{t('admin.loading')}</div>
      ) : !users.length ? (
        <div className="empty">{t('admin.noUsers')}</div>
      ) : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t('auth.name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.registered')}</th>
                <th>{t('admin.lastLogin')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role}`}>{t(`menu.${u.role}`)}</span>
                    {u.slug && (
                      <a href={`/escort/${u.slug}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 13, textDecoration: 'underline' }}>
                        {t('me.view')}
                      </a>
                    )}
                  </td>
                  <td className="muted">{fmt(u.created_at)}</td>
                  <td className="muted">{fmt(u.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
