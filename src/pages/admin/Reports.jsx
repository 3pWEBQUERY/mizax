import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { ChevronR } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { timeAgo } from '../../lib/time.js';

const spring = { type: 'spring', stiffness: 420, damping: 36 };

// Verwaltung: Meldungen, gruppiert nach gemeldetem Inhalt
export default function Reports({ onCount }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState('open');
  const [list, setList] = useState(null);

  const load = useCallback(() => {
    setList(null);
    api(`/api/admin/reports?status=${status}`)
      .then(setList)
      .catch(() => setList([]));
  }, [status]);
  useEffect(load, [load]);

  async function act(r, action) {
    if (action === 'remove' && !window.confirm(t('reportAdmin.confirmRemove'))) return;
    try {
      await api(`/api/admin/reports/${r.kind}/${r.targetId}`, { method: 'POST', body: { action } });
      setList((l) => l.filter((x) => !(x.kind === r.kind && x.targetId === r.targetId)));
      onCount?.();
      toast(t(`reportAdmin.done_${action}`));
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  return (
    <div className="admin-reports">
      <div className="range-switch report-filter" role="radiogroup" aria-label={t('reportAdmin.title')}>
        {[
          ['open', t('reportAdmin.open')],
          ['done', t('reportAdmin.done')],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={status === k}
            className={status === k ? 'active' : ''}
            onClick={() => setStatus(k)}
          >
            {status === k && <motion.span layoutId="report-filter" className="chip-bg" transition={spring} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {!list ? (
        <div className="panel empty">{t('admin.loading')}</div>
      ) : !list.length ? (
        <div className="panel stats-empty">
          <p>{status === 'open' ? t('reportAdmin.empty') : t('reportAdmin.emptyDone')}</p>
        </div>
      ) : (
        <div className="report-list">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.div
                key={`${r.kind}-${r.targetId}`}
                className="panel report-card"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <div className="report-top">
                  <span className="role-badge">{t(`reportAdmin.kind_${r.kind}`)}</span>
                  <b>{r.target ? r.target.title : t('reportAdmin.gone')}</b>
                  <span className="report-count">
                    {t(r.count === 1 ? 'reportAdmin.countOne' : 'reportAdmin.count', { n: r.count })}
                  </span>
                  <small>{timeAgo(r.lastAt, locale, 'short')}</small>
                </div>
                {r.target?.text && <p className="report-excerpt">{r.target.text}</p>}
                <div className="report-items">
                  {r.items.map((it) => (
                    <div key={it.id} className="report-item">
                      <span className="tag">{t(`report.reason_${it.reason}`)}</span>
                      <span className="report-by">
                        {it.reporter || t('reportAdmin.deletedUser')} · {timeAgo(it.at, locale, 'short')}
                      </span>
                      {it.details && <p>{it.details}</p>}
                    </div>
                  ))}
                </div>
                {status === 'open' && (
                  <div className="report-actions">
                    {r.target?.link && (
                      <Link to={r.target.link} className="status-pill">
                        {t('reportAdmin.view')}
                        <ChevronR width={12} height={12} />
                      </Link>
                    )}
                    <span className="report-spacer" />
                    <button type="button" className="status-pill" onClick={() => act(r, 'dismiss')}>
                      {t('reportAdmin.dismiss')}
                    </button>
                    {r.target?.removable && (
                      <button type="button" className="status-pill danger" onClick={() => act(r, 'remove')}>
                        {t('reportAdmin.remove')}
                      </button>
                    )}
                    {r.kind === 'escort' && r.target?.published && (
                      <button type="button" className="status-pill danger" onClick={() => act(r, 'hide')}>
                        {t('reportAdmin.hide')}
                      </button>
                    )}
                    <button type="button" className="small-btn" onClick={() => act(r, 'ok')}>
                      {t('reportAdmin.resolve')}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
