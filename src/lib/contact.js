export function digits(s = '') {
  return String(s)
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');
}

export function contactLinks(escort, text, t) {
  const msg = text || t('profile.defaultMessage', { name: escort.name });
  const links = [];
  if (escort.whatsapp) {
    links.push({
      kind: 'whatsapp',
      label: t('profile.whatsapp'),
      href: `https://wa.me/${digits(escort.whatsapp)}?text=${encodeURIComponent(msg)}`,
    });
  }
  if (escort.phone) {
    const tel = escort.phone.replace(/\s/g, '');
    links.push({ kind: 'sms', label: t('profile.sms'), href: `sms:${tel}?&body=${encodeURIComponent(msg)}` });
    links.push({ kind: 'call', label: t('profile.call'), href: `tel:${tel}` });
  }
  if (escort.email) {
    links.push({
      kind: 'mail',
      label: t('profile.email'),
      href: `mailto:${escort.email}?subject=${encodeURIComponent(t('profile.mailSubject'))}&body=${encodeURIComponent(msg)}`,
    });
  }
  return links;
}
