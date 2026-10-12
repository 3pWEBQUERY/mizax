// Öffentliches Profil einer Person aus Feed, Kommentaren, Nachrichten oder Bewertungen
export function profilePath(person) {
  if (!person) return null;
  if (person.kind === 'escort') return person.slug ? `/escort/${person.slug}` : null;
  return person.memberId ? `/member/${person.memberId}` : null;
}
