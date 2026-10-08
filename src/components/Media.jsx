import { useState } from 'react';

export function Placeholder({ escort, big = false }) {
  const accent = escort?.accent || '#6d4aff';
  return (
    <div
      className={`placeholder ${big ? 'placeholder-big' : ''}`}
      style={{
        background: `radial-gradient(120% 80% at 25% 10%, ${accent}cc 0%, transparent 60%),
          radial-gradient(90% 70% at 90% 100%, ${accent}66 0%, transparent 70%),
          linear-gradient(165deg, #2a3260 0%, #151a33 100%)`,
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
