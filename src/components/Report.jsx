import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './Toast.jsx';
import { CloseIcon, SpinnerIcon } from './Icons.jsx';
import { api } from '../lib/api.js';
import { useI18n, errorText } from '../lib/i18n.jsx';

const REASONS = ['spam', 'fake', 'harassment', 'inappropriate', 'underage', 'scam', 'other'];
const Ctx = createContext(() => {});

// Melden von Profilen, Beiträgen, Kommentaren und Bewertungen: useReport()({ kind, targetId, name })
export const useReport = () => useContext(Ctx);

export function ReportProvider({ children }) {
  const [target, setTarget] = useState(null);
  const open = useCallback((t) => setTarget(t), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {createPortal(
        <AnimatePresence>{target && <ReportDialog target={target} onClose={() => setTarget(null)} />}</AnimatePresence>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

function ReportDialog({ target, onClose }) {
  const { t } = useI18n();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: { kind: target.kind, targetId: target.targetId, reason, details },
      });
      toast(t('report.sent'));
      onClose();
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="modal-bg" onClick={onClose} />
      <motion.form
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="modal-head">
          <h2 id="report-title">{t(`report.title_${target.kind}`, { name: target.name || '' })}</h2>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label={t('profile.close')}>
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <p className="modal-text">{t('report.text')}</p>
        <div className="report-reasons" role="radiogroup" aria-label={t('report.reason')}>
          {REASONS.map((r) => (
            <label key={r} className={`report-reason ${reason === r ? 'on' : ''}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span className="report-dot" />
              {t(`report.reason_${r}`)}
            </label>
          ))}
        </div>
        <textarea
          className="input report-details"
          value={details}
          maxLength={1000}
          placeholder={t('report.details')}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="modal-bar">
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t('feed.cancel')}
          </button>
          <button type="submit" className="white-btn" disabled={!reason || busy}>
            {busy ? <SpinnerIcon /> : t('report.submit')}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
