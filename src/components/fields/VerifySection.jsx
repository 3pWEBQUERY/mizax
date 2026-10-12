import { useEffect, useRef, useState } from 'react';
import { useToast } from '../Toast.jsx';
import { CheckIcon, SpinnerIcon } from '../Icons.jsx';
import { Section } from './Form.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { dateTime } from '../../lib/time.js';

// Verifizierung im eigenen Profil: Code auf einen Zettel schreiben, Selfie hochladen,
// die Verwaltung prüft. Das Foto sieht nur die Verwaltung.
export default function VerifySection({ escort }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const inputRef = useRef(null);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const photoCount = escort.photos.length;

  useEffect(() => {
    api('/api/me/verification')
      .then(setState)
      .catch(() => {});
  }, [escort.id, escort.verified, photoCount]);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('photos', file);
      setState(await api('/api/me/verification', { method: 'POST', form }));
      toast(t('verify.sent'));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function withdraw() {
    setBusy(true);
    try {
      setState(await api('/api/me/verification', { method: 'DELETE' }));
      toast(t('verify.withdrawn'));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;
  const { status } = state;
  const canUpload = status !== 'verified' && photoCount > 0;

  return (
    <Section
      title={t('verify.title')}
      aside={
        <span className={`verify-pill ${status}`}>
          {status === 'verified' && <CheckIcon width={12} height={12} />}
          {t(`verify.status_${status}`)}
        </span>
      }
    >
      {status === 'verified' ? (
        <p className="verify-text">{t('verify.verifiedText')}</p>
      ) : (
        <>
          {status === 'pending' && (
            <p className="verify-text">{t('verify.pendingText', { time: dateTime(state.submittedAt, locale) })}</p>
          )}
          {status === 'rejected' && (
            <div className="verify-rejected">
              <b>{t('verify.rejectedText')}</b>
              {state.reason && <span>{t('verify.reason', { reason: state.reason })}</span>}
              <span>{t('verify.retry')}</span>
            </div>
          )}
          {status !== 'pending' && (
            <div className="verify-how">
              <div className="verify-code">
                <span>{t('verify.code')}</span>
                <b>{state.code}</b>
              </div>
              <ol className="verify-steps">
                <li>{t('verify.step1')}</li>
                <li>{t('verify.step2')}</li>
                <li>{t('verify.step3')}</li>
              </ol>
            </div>
          )}
          {photoCount === 0 && <div className="field-empty">{t('verify.needPhotos')}</div>}
          <p className="field-hint verify-privacy">{t('verify.privacy')}</p>
          {canUpload && (
            <div className="verify-actions">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                onChange={(e) => upload(e.target.files?.[0])}
              />
              <button
                type="button"
                className={status === 'pending' ? 'toggle' : 'toggle on'}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? <SpinnerIcon /> : status === 'pending' ? t('verify.replace') : t('verify.upload')}
              </button>
              {status === 'pending' && (
                <button type="button" className="toggle" disabled={busy} onClick={withdraw}>
                  {t('verify.withdraw')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
