// Texte der E-Mails in allen Sprachen der App. Platzhalter: {name}, {from}, {n} …

const T = {
  de: {
    footerNotify:
      'Du erhältst diese E-Mail, weil Benachrichtigungen aktiv sind. Du kannst sie in Mizax unter Einstellungen → Benachrichtigungen abschalten.',
    message: {
      subject: 'Neue Nachricht auf Mizax',
      title: 'Du hast eine neue Nachricht',
      lines: ['Hallo {name},', '{from} hat dir auf Mizax geschrieben.'],
      button: 'Nachricht lesen',
    },
    review: {
      subject: 'Neue Bewertung auf Mizax',
      title: 'Du wurdest bewertet',
      lines: ['Hallo {name},', '{from} hat dich mit {stars} bewertet.'],
      button: 'Bewertung ansehen',
    },
    comment: {
      subject: 'Neuer Kommentar auf Mizax',
      title: 'Neuer Kommentar zu deinem Beitrag',
      lines: ['Hallo {name},', '{from} hat deinen Beitrag kommentiert.'],
      button: 'Kommentar ansehen',
    },
    suggestions: {
      subject: '{n} neue Vorschläge für dich',
      title: 'Neue Vorschläge',
      lines: ['Hallo {name},', 'es gibt {n} neue Vorschläge, die zu deinen Präferenzen passen.'],
      button: 'Vorschläge ansehen',
    },
    suggestionsOne: {
      subject: 'Ein neuer Vorschlag für dich',
      title: 'Neuer Vorschlag',
      lines: ['Hallo {name},', 'es gibt einen neuen Vorschlag, der zu deinen Präferenzen passt.'],
      button: 'Vorschlag ansehen',
    },
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
    footerNotify:
      'You receive this email because notifications are on. You can turn them off in Mizax under Settings → Notifications.',
    message: {
      subject: 'New message on Mizax',
      title: 'You have a new message',
      lines: ['Hi {name},', '{from} wrote to you on Mizax.'],
      button: 'Read message',
    },
    review: {
      subject: 'New review on Mizax',
      title: 'You received a review',
      lines: ['Hi {name},', '{from} rated you {stars}.'],
      button: 'View review',
    },
    comment: {
      subject: 'New comment on Mizax',
      title: 'New comment on your post',
      lines: ['Hi {name},', '{from} commented on your post.'],
      button: 'View comment',
    },
    suggestions: {
      subject: '{n} new suggestions for you',
      title: 'New suggestions',
      lines: ['Hi {name},', 'there are {n} new suggestions matching your preferences.'],
      button: 'View suggestions',
    },
    suggestionsOne: {
      subject: 'A new suggestion for you',
      title: 'New suggestion',
      lines: ['Hi {name},', 'there is a new suggestion matching your preferences.'],
      button: 'View suggestion',
    },
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
    footerNotify:
      'Vous recevez cet e-mail car les notifications sont activées. Vous pouvez les désactiver dans Mizax sous Paramètres → Notifications.',
    message: {
      subject: 'Nouveau message sur Mizax',
      title: 'Vous avez un nouveau message',
      lines: ['Bonjour {name},', '{from} vous a écrit sur Mizax.'],
      button: 'Lire le message',
    },
    review: {
      subject: 'Nouvel avis sur Mizax',
      title: 'Vous avez reçu un avis',
      lines: ['Bonjour {name},', '{from} vous a attribué {stars}.'],
      button: 'Voir l’avis',
    },
    comment: {
      subject: 'Nouveau commentaire sur Mizax',
      title: 'Nouveau commentaire sur votre publication',
      lines: ['Bonjour {name},', '{from} a commenté votre publication.'],
      button: 'Voir le commentaire',
    },
    suggestions: {
      subject: '{n} nouvelles suggestions pour vous',
      title: 'Nouvelles suggestions',
      lines: ['Bonjour {name},', '{n} nouvelles suggestions correspondent à vos préférences.'],
      button: 'Voir les suggestions',
    },
    suggestionsOne: {
      subject: 'Une nouvelle suggestion pour vous',
      title: 'Nouvelle suggestion',
      lines: ['Bonjour {name},', 'une nouvelle suggestion correspond à vos préférences.'],
      button: 'Voir la suggestion',
    },
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
    footerNotify:
      'Recibes este correo porque las notificaciones están activadas. Puedes desactivarlas en Mizax en Ajustes → Notificaciones.',
    message: {
      subject: 'Nuevo mensaje en Mizax',
      title: 'Tienes un mensaje nuevo',
      lines: ['Hola {name}:', '{from} te ha escrito en Mizax.'],
      button: 'Leer mensaje',
    },
    review: {
      subject: 'Nueva valoración en Mizax',
      title: 'Has recibido una valoración',
      lines: ['Hola {name}:', '{from} te ha valorado con {stars}.'],
      button: 'Ver valoración',
    },
    comment: {
      subject: 'Nuevo comentario en Mizax',
      title: 'Nuevo comentario en tu publicación',
      lines: ['Hola {name}:', '{from} ha comentado tu publicación.'],
      button: 'Ver comentario',
    },
    suggestions: {
      subject: '{n} nuevas sugerencias para ti',
      title: 'Nuevas sugerencias',
      lines: ['Hola {name}:', 'hay {n} nuevas sugerencias que encajan con tus preferencias.'],
      button: 'Ver sugerencias',
    },
    suggestionsOne: {
      subject: 'Una nueva sugerencia para ti',
      title: 'Nueva sugerencia',
      lines: ['Hola {name}:', 'hay una nueva sugerencia que encaja con tus preferencias.'],
      button: 'Ver sugerencia',
    },
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
    footerNotify:
      'Azért kapod ezt az e-mailt, mert az értesítések be vannak kapcsolva. A Mizaxban a Beállítások → Értesítések alatt kikapcsolhatod.',
    message: {
      subject: 'Új üzenet a Mizaxon',
      title: 'Új üzeneted érkezett',
      lines: ['Szia {name}!', '{from} írt neked a Mizaxon.'],
      button: 'Üzenet elolvasása',
    },
    review: {
      subject: 'Új értékelés a Mizaxon',
      title: 'Értékelést kaptál',
      lines: ['Szia {name}!', '{from} {stars} értékelést adott neked.'],
      button: 'Értékelés megtekintése',
    },
    comment: {
      subject: 'Új hozzászólás a Mizaxon',
      title: 'Új hozzászólás a bejegyzésedhez',
      lines: ['Szia {name}!', '{from} hozzászólt a bejegyzésedhez.'],
      button: 'Hozzászólás megtekintése',
    },
    suggestions: {
      subject: '{n} új ajánlat neked',
      title: 'Új ajánlatok',
      lines: ['Szia {name}!', '{n} új ajánlat illik a preferenciáidhoz.'],
      button: 'Ajánlatok megtekintése',
    },
    suggestionsOne: {
      subject: 'Egy új ajánlat neked',
      title: 'Új ajánlat',
      lines: ['Szia {name}!', 'egy új ajánlat illik a preferenciáidhoz.'],
      button: 'Ajánlat megtekintése',
    },
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
    footerNotify:
      'Otrzymujesz tę wiadomość, ponieważ powiadomienia są włączone. Możesz je wyłączyć w Mizax w Ustawienia → Powiadomienia.',
    message: {
      subject: 'Nowa wiadomość w Mizax',
      title: 'Masz nową wiadomość',
      lines: ['Cześć {name},', '{from} napisał(a) do Ciebie w Mizax.'],
      button: 'Przeczytaj wiadomość',
    },
    review: {
      subject: 'Nowa opinia w Mizax',
      title: 'Otrzymano opinię',
      lines: ['Cześć {name},', '{from} ocenił(a) Cię na {stars}.'],
      button: 'Zobacz opinię',
    },
    comment: {
      subject: 'Nowy komentarz w Mizax',
      title: 'Nowy komentarz do Twojego wpisu',
      lines: ['Cześć {name},', '{from} skomentował(a) Twój wpis.'],
      button: 'Zobacz komentarz',
    },
    suggestions: {
      subject: 'Nowe propozycje dla Ciebie: {n}',
      title: 'Nowe propozycje',
      lines: ['Cześć {name},', 'pojawiły się nowe propozycje pasujące do Twoich preferencji: {n}.'],
      button: 'Zobacz propozycje',
    },
    suggestionsOne: {
      subject: 'Nowa propozycja dla Ciebie',
      title: 'Nowa propozycja',
      lines: ['Cześć {name},', 'pojawiła się nowa propozycja pasująca do Twoich preferencji.'],
      button: 'Zobacz propozycję',
    },
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
    footerNotify:
      'Primești acest e-mail pentru că notificările sunt activate. Le poți dezactiva în Mizax la Setări → Notificări.',
    message: {
      subject: 'Mesaj nou pe Mizax',
      title: 'Ai un mesaj nou',
      lines: ['Bună, {name},', '{from} ți-a scris pe Mizax.'],
      button: 'Citește mesajul',
    },
    review: {
      subject: 'Recenzie nouă pe Mizax',
      title: 'Ai primit o recenzie',
      lines: ['Bună, {name},', '{from} te-a evaluat cu {stars}.'],
      button: 'Vezi recenzia',
    },
    comment: {
      subject: 'Comentariu nou pe Mizax',
      title: 'Comentariu nou la postarea ta',
      lines: ['Bună, {name},', '{from} a comentat postarea ta.'],
      button: 'Vezi comentariul',
    },
    suggestions: {
      subject: '{n} sugestii noi pentru tine',
      title: 'Sugestii noi',
      lines: ['Bună, {name},', 'există {n} sugestii noi potrivite preferințelor tale.'],
      button: 'Vezi sugestiile',
    },
    suggestionsOne: {
      subject: 'O sugestie nouă pentru tine',
      title: 'Sugestie nouă',
      lines: ['Bună, {name},', 'există o sugestie nouă potrivită preferințelor tale.'],
      button: 'Vezi sugestia',
    },
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
    // Benachrichtigungen enthalten den Hinweis, wie man sie abschaltet
    footer: key === 'reset' ? T[lang].footer : T[lang].footerNotify,
  };
}
