import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useDock } from '../lib/dock.jsx';
import { useT } from '../lib/i18n.jsx';

export default function NotFound() {
  useDock({ mode: 'search' });
  const t = useT();
  return (
    <Page>
      <div className="bubbles" style={{ marginTop: '12vh' }}>
        <Bubble i={0}>{t('notFound.title')}</Bubble>
        <Bubble i={1}>{t('notFound.text')}</Bubble>
        <Rise i={2}>
          <Link to="/" className="white-btn">
            {t('notFound.back')}
          </Link>
        </Rise>
      </div>
    </Page>
  );
}
