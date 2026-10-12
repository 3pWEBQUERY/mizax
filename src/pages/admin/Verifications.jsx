import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { CheckIcon, ChevronR } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { dateTime } from '../../lib/time.js';

const spring = { type: 'spring', stiffness: 420, damping: 36 };
const PRESETS = ['code', 'face', 'match'];

// Verwaltung: Verifizierungs-Anfragen prüfen (Nachweisfoto neben den Profilfotos)
export default function Verifications({ onCount }) {
  const { t } = useI18n();
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState(null);

  const load = useCallback(() => {
    setList(null);
    api(`/api/admin/verifications?status=${status === 'pending' ? 'pending' : 'done'}`)
      .then(setList)
      .catch(() => setList([]));
  }, [status]);
  useEffect(load, [load]);

  return (
    <div className="admin-reports">
      <div className="range-switch report-filter" role="radiogroup" aria-label={t('verifyAdmin.title')}>
        {[
          ['pending', t('verifyAdmin.open')],
          ['done', t('verifyAdmin.done')],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={status === k}
            className={status === k ? 'active' : ''}
            onClick={() => setStatus(k)}
          >
            {status === k && <motion.span layoutId="verify-filter" className="chip-bg" transition={spring} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {!list ? (
        <div className="panel empty">{t('admin.loading')}</div>
      ) : !list.length ? (
        <div className="panel stats-empty">
          <p>{status === 'pending' ? t('verifyAdmin.empty') : t('verifyAdmin.emptyDone')}</p>
        </div>
      ) : (
        <div className="report-list">
          <AnimatePresence initial={false}>
            {list.map((v) => (
              <Request
                key={v.id}
                v={v}
                onDone={() => {
                  setList((l) => l.filter((x) => x.id !== v.id));
                  onCount?.();
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Request({ v, onDone }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = v.status === 'pending';

  async function decide(action) {
    setBusy(true);
    try {
      await api(`/api/admin/verifications/${v.id}`, { method: 'POST', body: { action, reason } });
      toast(t(`verifyAdmin.done_${action}`));
      onDone();
    } catch (err) {
      toast(errorText(t, err));
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="panel report-card verify-card"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <div className="report-top">
        <Link to={`/escort/${v.escort.slug}`} className="verify-name">
          <b>
            {v.escort.name}
            {v.escort.age ? `, ${v.escort.age}` : ''}
          </b>
          <ChevronR width={12} height={12} />
        </Link>
        {v.escort.city && <span className="report-by">{v.escort.city}</span>}
        {!v.escort.published && <span className="role-badge">{t('verifyAdmin.hidden')}</span>}
        {!pending && (
          <span className={`verify-pill ${v.status === 'approved' ? 'verified' : 'rejected'}`}>
            {v.status === 'approved' && <CheckIcon width={12} height={12} />}
            {t(`verifyAdmin.${v.status}`)}
          </span>
        )}
        <small>
          {pending
            ? t('verifyAdmin.submitted', { time: dateTime(v.createdAt, locale) })
            : `${dateTime(v.decidedAt, locale)}${v.decidedBy ? ` · ${t('verifyAdmin.by', { name: v.decidedBy })}` : ''}`}
        </small>
      </div>

      {pending ? (
        <div className="verify-compare">
          <figure className="verify-proof">
            {v.photo ? (
              <a href={v.photo} target="_blank" rel="noreferrer" aria-label={t('verifyAdmin.zoom')}>
                <img src={v.photo} alt={t('verifyAdmin.proof')} />
              </a>
            ) : (
              <div className="verify-gone">{t('verifyAdmin.photoGone')}</div>
            )}
            <figcaption>
              {t('verifyAdmin.code')} <b>{v.code}</b>
            </figcaption>
          </figure>
          <div className="verify-side">
            <span className="verify-label">{t('verifyAdmin.profilePhotos')}</span>
            <div className="verify-thumbs">
              {v.escort.photos.map((p) => (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.thumb} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        v.reason && <p className="report-excerpt">{v.reason}</p>
      )}

      {pending && rejecting && (
        <div className="verify-reject">
          <div className="verify-presets">
            {PRESETS.map((k) => {
              const text = t(`verifyAdmin.reason_${k}`);
              return (
                <button
                  key={k}
                  type="button"
                  className={`toggle ${reason === text ? 'on' : ''}`}
                  onClick={() => setReason(text)}
                >
                  {text}
                </button>
              );
            })}
          </div>
          <textarea
            className="input report-details"
            value={reason}
            maxLength={500}
            placeholder={t('verifyAdmin.reasonPlaceholder')}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}

      {pending && (
        <div className="report-actions">
          <span className="report-spacer" />
          {rejecting ? (
            <>
              <button type="button" className="status-pill" onClick={() => setRejecting(false)} disabled={busy}>
                {t('feed.cancel')}
              </button>
              <button
                type="button"
                className="status-pill danger"
                onClick={() => decide('reject')}
                disabled={busy || !reason.trim()}
              >
                {t('verifyAdmin.rejectSend')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="status-pill danger" onClick={() => setRejecting(true)}>
                {t('verifyAdmin.reject')}
              </button>
              <button type="button" className="small-btn" onClick={() => decide('approve')} disabled={busy}>
                <CheckIcon width={14} height={14} />
                {t('verifyAdmin.approve')}
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
