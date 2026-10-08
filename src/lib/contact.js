export function digits(s = '') {
  return String(s).replace(/[^\d+]/g, '').replace(/^\+/, '');
}

export function contactLinks(escort, text = '') {
  const msg = text || `Hallo ${escort.name}, ich habe dein Profil auf Mizax gesehen.`;
  const links = [];
  if (escort.whatsapp) {
    links.push({ kind: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${digits(escort.whatsapp)}?text=${encodeURIComponent(msg)}` });
  }
  if (escort.phone) {
    links.push({ kind: 'sms', label: 'SMS', href: `sms:${escort.phone.replace(/\s/g, '')}?&body=${encodeURIComponent(msg)}` });
    links.push({ kind: 'call', label: 'Anrufen', href: `tel:${escort.phone.replace(/\s/g, '')}` });
  }
  if (escort.email) {
    links.push({ kind: 'mail', label: 'E-Mail', href: `mailto:${escort.email}?subject=${encodeURIComponent('Anfrage über Mizax')}&body=${encodeURIComponent(msg)}` });
  }
  return links;
}
