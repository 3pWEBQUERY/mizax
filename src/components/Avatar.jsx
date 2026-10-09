// Rundes Profilbild: Foto oder Initiale auf Farbverlauf
export default function Avatar({ name, thumb, size = 40, className = '' }) {
  return (
    <span className={`person ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {thumb ? <img src={thumb} alt="" loading="lazy" /> : (name || '?').trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
