import { Rise } from './Bubble.jsx';

// Kompakter Kopfbereich wie auf „Mein Profil“
export default function PageHead({ title, text, children, wide = false, className = '' }) {
  return (
    <div className={`me-head ${wide ? 'page-head-wide' : ''} ${className}`}>
      <div className="me-head-text">
        <Rise i={0} as="h1" className="me-title">
          {title}
        </Rise>
        {text && (
          <Rise i={1} as="p" className="me-intro">
            {text}
          </Rise>
        )}
      </div>
      {children && (
        <Rise i={2} className="me-status">
          {children}
        </Rise>
      )}
    </div>
  );
}
