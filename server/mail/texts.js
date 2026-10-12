// Texte der E-Mails in allen Sprachen der App. Platzhalter: {name}, {from}, {n} …

const T = {
  de: {
    footer: 'Diese E-Mail wurde automatisch von Mizax verschickt.',
    reset: {
      subject: 'Passwort zurücksetzen',
      title: 'Neues Passwort festlegen',
      lines: [
        'Hallo {name},',
        'du hast ein neues Passwort für dein Mizax-Konto angefordert. Der Link ist eine Stunde gültig.',
        'Wenn du das nicht warst, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.',
      ],
      button: 'Passwort festlegen',
    },
  },
  en: {
    footer: 'This email was sent automatically by Mizax.',
    reset: {
      subject: 'Reset your password',
      title: 'Choose a new password',
      lines: [
        'Hi {name},',
        'you requested a new password for your Mizax account. The link is valid for one hour.',
        'If this wasn’t you, you can ignore this email – your password stays the same.',
      ],
      button: 'Set password',
    },
  },
  fr: {
    footer: 'Cet e-mail a été envoyé automatiquement par Mizax.',
    reset: {
      subject: 'Réinitialiser votre mot de passe',
      title: 'Choisir un nouveau mot de passe',
      lines: [
        'Bonjour {name},',
        'vous avez demandé un nouveau mot de passe pour votre compte Mizax. Le lien est valable une heure.',
        'Si ce n’était pas vous, ignorez cet e-mail – votre mot de passe reste inchangé.',
      ],
      button: 'Définir le mot de passe',
    },
  },
  es: {
    footer: 'Este correo fue enviado automáticamente por Mizax.',
    reset: {
      subject: 'Restablecer contraseña',
      title: 'Elige una nueva contraseña',
      lines: [
        'Hola {name}:',
        'has solicitado una nueva contraseña para tu cuenta de Mizax. El enlace es válido durante una hora.',
        'Si no fuiste tú, ignora este correo: tu contraseña no cambia.',
      ],
      button: 'Establecer contraseña',
    },
  },
  hu: {
    footer: 'Ezt az e-mailt a Mizax automatikusan küldte.',
    reset: {
      subject: 'Jelszó visszaállítása',
      title: 'Új jelszó megadása',
      lines: [
        'Szia {name}!',
        'Új jelszót kértél a Mizax-fiókodhoz. A link egy óráig érvényes.',
        'Ha nem te voltál, hagyd figyelmen kívül ezt az e-mailt – a jelszavad nem változik.',
      ],
      button: 'Jelszó megadása',
    },
  },
  pl: {
    footer: 'Ta wiadomość została wysłana automatycznie przez Mizax.',
    reset: {
      subject: 'Resetowanie hasła',
      title: 'Ustaw nowe hasło',
      lines: [
        'Cześć {name},',
        'poproszono o nowe hasło do Twojego konta Mizax. Link jest ważny przez godzinę.',
        'Jeśli to nie Ty, zignoruj tę wiadomość – hasło pozostanie bez zmian.',
      ],
      button: 'Ustaw hasło',
    },
  },
  ro: {
    footer: 'Acest e-mail a fost trimis automat de Mizax.',
    reset: {
      subject: 'Resetarea parolei',
      title: 'Alege o parolă nouă',
      lines: [
        'Bună, {name},',
        'ai cerut o parolă nouă pentru contul tău Mizax. Linkul este valabil o oră.',
        'Dacă nu ai fost tu, ignoră acest e-mail – parola rămâne neschimbată.',
      ],
      button: 'Setează parola',
    },
  },
};

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

export function mailText(locale, key, vars) {
  const lang = T[locale] ? locale : 'de';
  const m = T[lang][key] || T.de[key];
  return {
    subject: fill(m.subject, vars),
    title: fill(m.title, vars),
    lines: m.lines.map((l) => fill(l, vars)),
    button: m.button,
    footer: T[lang].footer,
  };
}
