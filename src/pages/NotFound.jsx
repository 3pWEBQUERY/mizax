import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useDock } from '../lib/dock.jsx';

export default function NotFound() {
  useDock({ mode: 'search' });
  return (
    <Page>
      <div className="bubbles" style={{ marginTop: '12vh' }}>
        <Bubble i={0}>Hier ist leider nichts.</Bubble>
        <Bubble i={1}>Diese Seite gibt es nicht (mehr).</Bubble>
        <Rise i={2}>
          <Link to="/" className="white-btn">
            Zur Übersicht
          </Link>
        </Rise>
      </div>
    </Page>
  );
}
