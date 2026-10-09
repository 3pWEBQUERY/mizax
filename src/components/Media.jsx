import { useState } from 'react';

export function Placeholder({ escort, big = false }) {
  const accent = escort?.accent || '#6d4aff';
  return (
    <div
      className={`placeholder ${big ? 'placeholder-big' : ''}`}
      style={{
        background: `radial-gradient(120% 85% at 30% 0%, ${accent}38 0%, transparent 70%), var(--tint-2)`,
      }}
    >
      <span className="placeholder-letter">{escort?.name?.[0] || '?'}</span>
    </div>
  );
}

// Bild mit sanftem Einblenden; zeigt vorher das kleine Vorschaubild bzw. einen Platzhalter
export function Photo({ src, lowSrc, alt = '', escort, big = false, eager = false }) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return <Placeholder escort={escort} big={big} />;
  return (
    <>
      {lowSrc && lowSrc !== src ? (
        <img className="media-fill" src={lowSrc} alt="" aria-hidden="true" draggable={false} />
      ) : (
        <Placeholder escort={escort} big={big} />
      )}
      <img
        className="media-fill"
        src={src}
        alt={alt}
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete && el.naturalWidth && !loaded) setLoaded(true);
        }}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity .5s cubic-bezier(.22,1,.36,1)' }}
      />
    </>
  );
}
