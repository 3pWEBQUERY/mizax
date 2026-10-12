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
    verifyOk: {
      subject: 'Dein Profil ist verifiziert',
      title: 'Profil verifiziert',
      lines: [
        'Hallo {name},',
        'wir haben dein Foto geprüft. Dein Profil trägt ab sofort das Abzeichen „Verifiziert“. Das Nachweisfoto haben wir gelöscht.',
      ],
      button: 'Profil ansehen',
    },
    verifyNo: {
      subject: 'Verifizierung nicht bestätigt',
      title: 'Verifizierung nicht bestätigt',
      lines: [
        'Hallo {name},',
        'wir konnten dein Profil leider noch nicht verifizieren. Grund: {reason}',
        'Du kannst jederzeit ein neues Foto mit deinem neuen Code hochladen. Das bisherige Foto haben wir gelöscht.',
      ],
      button: 'Neues Foto hochladen',
    },
    reply: {
      subject: '{from} hat auf deine Bewertung geantwortet',
      title: 'Neue Antwort auf deine Bewertung',
      lines: ['Hallo {name},', '{from} hat auf deine Bewertung geantwortet.'],
      button: 'Antwort lesen',
    },
    invoice: {
      subject: 'Deine Rechnung {number} – {plan}',
      title: 'Rechnung für dein Abo',
      lines: [
        'Hallo {name},',
        'danke für deine Bestellung. Dein Paket „{plan}“ kostet {amount} für einen Monat.',
        'Bitte bezahle bis {due} mit der QR-Rechnung in deinem Konto. Sobald die Zahlung eingegangen ist, schalten wir dein Paket frei.',
      ],
      button: 'Rechnung ansehen',
    },
    invoiceRenew: {
      subject: 'Dein Abo „{plan}“ läuft bald ab',
      title: 'Rechnung für den nächsten Monat',
      lines: [
        'Hallo {name},',
        'dein Paket „{plan}“ läuft bald ab. Die Rechnung {number} über {amount} für den nächsten Monat ist bereit.',
        'Bitte bezahle bis {due}, damit dein Profil ohne Unterbruch weiterläuft.',
      ],
      button: 'Rechnung ansehen',
    },
    planActive: {
      subject: 'Zahlung erhalten – „{plan}“ ist aktiv',
      title: 'Dein Paket ist aktiv',
      lines: ['Hallo {name},', 'wir haben deine Zahlung erhalten. Dein Paket „{plan}“ ist aktiv bis {until}.'],
      button: 'Abo ansehen',
    },
    planExpired: {
      subject: 'Dein Abo „{plan}“ ist abgelaufen',
      title: 'Abo abgelaufen',
      lines: [
        'Hallo {name},',
        'dein Paket „{plan}“ ist abgelaufen. Du kannst es jederzeit in deinem Konto wieder buchen.',
      ],
      button: 'Paket wählen',
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
    verifyOk: {
      subject: 'Your profile is verified',
      title: 'Profile verified',
      lines: [
        'Hi {name},',
        'we have checked your photo. Your profile now shows the “Verified” badge. We have deleted the verification photo.',
      ],
      button: 'View profile',
    },
    verifyNo: {
      subject: 'Verification not confirmed',
      title: 'Verification not confirmed',
      lines: [
        'Hi {name},',
        'unfortunately we could not verify your profile yet. Reason: {reason}',
        'You can upload a new photo with your new code at any time. We have deleted the previous photo.',
      ],
      button: 'Upload a new photo',
    },
    reply: {
      subject: '{from} replied to your review',
      title: 'New reply to your review',
      lines: ['Hi {name},', '{from} replied to your review.'],
      button: 'Read reply',
    },
    invoice: {
      subject: 'Your invoice {number} – {plan}',
      title: 'Invoice for your subscription',
      lines: [
        'Hi {name},',
        'thank you for your order. Your “{plan}” plan costs {amount} for one month.',
        'Please pay by {due} using the QR bill in your account. As soon as the payment arrives, we activate your plan.',
      ],
      button: 'View invoice',
    },
    invoiceRenew: {
      subject: 'Your “{plan}” subscription ends soon',
      title: 'Invoice for next month',
      lines: [
        'Hi {name},',
        'your “{plan}” plan ends soon. Invoice {number} for {amount} for the next month is ready.',
        'Please pay by {due} so your profile continues without interruption.',
      ],
      button: 'View invoice',
    },
    planActive: {
      subject: 'Payment received – “{plan}” is active',
      title: 'Your plan is active',
      lines: ['Hi {name},', 'we have received your payment. Your “{plan}” plan is active until {until}.'],
      button: 'View subscription',
    },
    planExpired: {
      subject: 'Your “{plan}” subscription has expired',
      title: 'Subscription expired',
      lines: ['Hi {name},', 'your “{plan}” plan has expired. You can book it again at any time in your account.'],
      button: 'Choose a plan',
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
    verifyOk: {
      subject: 'Votre profil est vérifié',
      title: 'Profil vérifié',
      lines: [
        'Bonjour {name},',
        'nous avons vérifié votre photo. Votre profil affiche désormais le badge « Vérifié ». Nous avons supprimé la photo de vérification.',
      ],
      button: 'Voir le profil',
    },
    verifyNo: {
      subject: 'Vérification non confirmée',
      title: 'Vérification non confirmée',
      lines: [
        'Bonjour {name},',
        'nous n’avons malheureusement pas encore pu vérifier votre profil. Motif : {reason}',
        'Vous pouvez à tout moment envoyer une nouvelle photo avec votre nouveau code. Nous avons supprimé la photo précédente.',
      ],
      button: 'Envoyer une nouvelle photo',
    },
    reply: {
      subject: '{from} a répondu à votre avis',
      title: 'Nouvelle réponse à votre avis',
      lines: ['Bonjour {name},', '{from} a répondu à votre avis.'],
      button: 'Lire la réponse',
    },
    invoice: {
      subject: 'Votre facture {number} – {plan}',
      title: 'Facture de votre abonnement',
      lines: [
        'Bonjour {name},',
        'merci pour votre commande. Votre forfait « {plan} » coûte {amount} pour un mois.',
        'Veuillez payer d’ici le {due} avec la facture QR dans votre compte. Dès réception du paiement, nous activons votre forfait.',
      ],
      button: 'Voir la facture',
    },
    invoiceRenew: {
      subject: 'Votre abonnement « {plan} » arrive à échéance',
      title: 'Facture du mois suivant',
      lines: [
        'Bonjour {name},',
        'votre forfait « {plan} » arrive bientôt à échéance. La facture {number} de {amount} pour le mois suivant est prête.',
        'Veuillez payer d’ici le {due} pour que votre profil continue sans interruption.',
      ],
      button: 'Voir la facture',
    },
    planActive: {
      subject: 'Paiement reçu – « {plan} » est actif',
      title: 'Votre forfait est actif',
      lines: [
        'Bonjour {name},',
        'nous avons reçu votre paiement. Votre forfait « {plan} » est actif jusqu’au {until}.',
      ],
      button: 'Voir l’abonnement',
    },
    planExpired: {
      subject: 'Votre abonnement « {plan} » a expiré',
      title: 'Abonnement expiré',
      lines: [
        'Bonjour {name},',
        'votre forfait « {plan} » a expiré. Vous pouvez le réserver à nouveau à tout moment dans votre compte.',
      ],
      button: 'Choisir un forfait',
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
    verifyOk: {
      subject: 'Tu perfil está verificado',
      title: 'Perfil verificado',
      lines: [
        'Hola {name}:',
        'hemos revisado tu foto. Tu perfil ya muestra la insignia «Verificado». Hemos eliminado la foto de verificación.',
      ],
      button: 'Ver perfil',
    },
    verifyNo: {
      subject: 'Verificación no confirmada',
      title: 'Verificación no confirmada',
      lines: [
        'Hola {name}:',
        'lamentablemente aún no hemos podido verificar tu perfil. Motivo: {reason}',
        'Puedes subir en cualquier momento una nueva foto con tu nuevo código. Hemos eliminado la foto anterior.',
      ],
      button: 'Subir nueva foto',
    },
    reply: {
      subject: '{from} ha respondido a tu valoración',
      title: 'Nueva respuesta a tu valoración',
      lines: ['Hola {name}:', '{from} ha respondido a tu valoración.'],
      button: 'Leer respuesta',
    },
    invoice: {
      subject: 'Tu factura {number} – {plan}',
      title: 'Factura de tu suscripción',
      lines: [
        'Hola {name}:',
        'gracias por tu pedido. Tu plan «{plan}» cuesta {amount} por un mes.',
        'Paga antes del {due} con la factura QR de tu cuenta. En cuanto recibamos el pago, activaremos tu plan.',
      ],
      button: 'Ver factura',
    },
    invoiceRenew: {
      subject: 'Tu suscripción «{plan}» termina pronto',
      title: 'Factura del próximo mes',
      lines: [
        'Hola {name}:',
        'tu plan «{plan}» termina pronto. La factura {number} de {amount} para el próximo mes está lista.',
        'Paga antes del {due} para que tu perfil siga sin interrupción.',
      ],
      button: 'Ver factura',
    },
    planActive: {
      subject: 'Pago recibido: «{plan}» está activo',
      title: 'Tu plan está activo',
      lines: ['Hola {name}:', 'hemos recibido tu pago. Tu plan «{plan}» está activo hasta el {until}.'],
      button: 'Ver suscripción',
    },
    planExpired: {
      subject: 'Tu suscripción «{plan}» ha caducado',
      title: 'Suscripción caducada',
      lines: [
        'Hola {name}:',
        'tu plan «{plan}» ha caducado. Puedes contratarlo de nuevo en cualquier momento desde tu cuenta.',
      ],
      button: 'Elegir plan',
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
    verifyOk: {
      subject: 'A profilod ellenőrizve',
      title: 'Profil ellenőrizve',
      lines: [
        'Szia {name}!',
        'Ellenőriztük a fotódat. A profilodon mostantól megjelenik az „Ellenőrzött” jelvény. Az ellenőrző fotót töröltük.',
      ],
      button: 'Profil megtekintése',
    },
    verifyNo: {
      subject: 'Az ellenőrzés nem sikerült',
      title: 'Az ellenőrzés nem sikerült',
      lines: [
        'Szia {name}!',
        'Sajnos még nem tudtuk ellenőrizni a profilodat. Indok: {reason}',
        'Bármikor feltölthetsz egy új fotót az új kódoddal. Az előző fotót töröltük.',
      ],
      button: 'Új fotó feltöltése',
    },
    reply: {
      subject: '{from} válaszolt az értékelésedre',
      title: 'Új válasz az értékelésedre',
      lines: ['Szia {name}!', '{from} válaszolt az értékelésedre.'],
      button: 'Válasz elolvasása',
    },
    invoice: {
      subject: '{number} számú számlád – {plan}',
      title: 'Számla az előfizetésedhez',
      lines: [
        'Szia {name}!',
        'Köszönjük a rendelést. A(z) „{plan}” csomag ára {amount} egy hónapra.',
        'Kérjük, fizess {due}-ig a fiókodban található QR-számlával. Amint megérkezik a befizetés, aktiváljuk a csomagot.',
      ],
      button: 'Számla megtekintése',
    },
    invoiceRenew: {
      subject: 'A(z) „{plan}” előfizetésed hamarosan lejár',
      title: 'Számla a következő hónapra',
      lines: [
        'Szia {name}!',
        'A(z) „{plan}” csomagod hamarosan lejár. A következő hónapra szóló {number} számú, {amount} összegű számla elkészült.',
        'Kérjük, fizess {due}-ig, hogy a profilod megszakítás nélkül fusson tovább.',
      ],
      button: 'Számla megtekintése',
    },
    planActive: {
      subject: 'Befizetés megérkezett – a(z) „{plan}” aktív',
      title: 'A csomagod aktív',
      lines: ['Szia {name}!', 'Megkaptuk a befizetésedet. A(z) „{plan}” csomagod {until}-ig aktív.'],
      button: 'Előfizetés megtekintése',
    },
    planExpired: {
      subject: 'A(z) „{plan}” előfizetésed lejárt',
      title: 'Az előfizetés lejárt',
      lines: ['Szia {name}!', 'A(z) „{plan}” csomagod lejárt. Bármikor újra megrendelheted a fiókodban.'],
      button: 'Csomag választása',
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
    verifyOk: {
      subject: 'Twój profil jest zweryfikowany',
      title: 'Profil zweryfikowany',
      lines: [
        'Cześć {name},',
        'sprawdziliśmy Twoje zdjęcie. Twój profil ma teraz odznakę „Zweryfikowany”. Zdjęcie weryfikacyjne zostało usunięte.',
      ],
      button: 'Zobacz profil',
    },
    verifyNo: {
      subject: 'Weryfikacja niepotwierdzona',
      title: 'Weryfikacja niepotwierdzona',
      lines: [
        'Cześć {name},',
        'niestety nie mogliśmy jeszcze zweryfikować Twojego profilu. Powód: {reason}',
        'W każdej chwili możesz przesłać nowe zdjęcie z nowym kodem. Poprzednie zdjęcie zostało usunięte.',
      ],
      button: 'Prześlij nowe zdjęcie',
    },
    reply: {
      subject: '{from} odpowiedział(a) na Twoją opinię',
      title: 'Nowa odpowiedź na Twoją opinię',
      lines: ['Cześć {name},', '{from} odpowiedział(a) na Twoją opinię.'],
      button: 'Przeczytaj odpowiedź',
    },
    invoice: {
      subject: 'Twoja faktura {number} – {plan}',
      title: 'Faktura za subskrypcję',
      lines: [
        'Cześć {name},',
        'dziękujemy za zamówienie. Pakiet „{plan}” kosztuje {amount} za miesiąc.',
        'Zapłać do {due}, korzystając z faktury QR w swoim koncie. Gdy tylko płatność wpłynie, aktywujemy pakiet.',
      ],
      button: 'Zobacz fakturę',
    },
    invoiceRenew: {
      subject: 'Twoja subskrypcja „{plan}” wkrótce wygasa',
      title: 'Faktura na następny miesiąc',
      lines: [
        'Cześć {name},',
        'Twój pakiet „{plan}” wkrótce wygasa. Faktura {number} na kwotę {amount} za następny miesiąc jest gotowa.',
        'Zapłać do {due}, aby Twój profil działał bez przerwy.',
      ],
      button: 'Zobacz fakturę',
    },
    planActive: {
      subject: 'Płatność otrzymana – „{plan}” jest aktywny',
      title: 'Twój pakiet jest aktywny',
      lines: ['Cześć {name},', 'otrzymaliśmy Twoją płatność. Pakiet „{plan}” jest aktywny do {until}.'],
      button: 'Zobacz subskrypcję',
    },
    planExpired: {
      subject: 'Twoja subskrypcja „{plan}” wygasła',
      title: 'Subskrypcja wygasła',
      lines: [
        'Cześć {name},',
        'Twój pakiet „{plan}” wygasł. W każdej chwili możesz go ponownie wykupić w swoim koncie.',
      ],
      button: 'Wybierz pakiet',
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
    verifyOk: {
      subject: 'Profilul tău este verificat',
      title: 'Profil verificat',
      lines: [
        'Bună {name},',
        'am verificat fotografia ta. Profilul tău afișează acum insigna „Verificat”. Am șters fotografia de verificare.',
      ],
      button: 'Vezi profilul',
    },
    verifyNo: {
      subject: 'Verificarea nu a fost confirmată',
      title: 'Verificarea nu a fost confirmată',
      lines: [
        'Bună {name},',
        'din păcate nu am putut încă verifica profilul tău. Motiv: {reason}',
        'Poți încărca oricând o fotografie nouă cu noul tău cod. Am șters fotografia anterioară.',
      ],
      button: 'Încarcă o fotografie nouă',
    },
    reply: {
      subject: '{from} a răspuns la recenzia ta',
      title: 'Răspuns nou la recenzia ta',
      lines: ['Bună {name},', '{from} a răspuns la recenzia ta.'],
      button: 'Citește răspunsul',
    },
    invoice: {
      subject: 'Factura ta {number} – {plan}',
      title: 'Factură pentru abonament',
      lines: [
        'Bună {name},',
        'îți mulțumim pentru comandă. Pachetul „{plan}” costă {amount} pentru o lună.',
        'Te rugăm să plătești până la {due} folosind factura QR din contul tău. Imediat ce primim plata, activăm pachetul.',
      ],
      button: 'Vezi factura',
    },
    invoiceRenew: {
      subject: 'Abonamentul „{plan}” expiră în curând',
      title: 'Factură pentru luna următoare',
      lines: [
        'Bună {name},',
        'pachetul tău „{plan}” expiră în curând. Factura {number} de {amount} pentru luna următoare este pregătită.',
        'Te rugăm să plătești până la {due}, ca profilul tău să continue fără întrerupere.',
      ],
      button: 'Vezi factura',
    },
    planActive: {
      subject: 'Plată primită – „{plan}” este activ',
      title: 'Pachetul tău este activ',
      lines: ['Bună {name},', 'am primit plata ta. Pachetul „{plan}” este activ până la {until}.'],
      button: 'Vezi abonamentul',
    },
    planExpired: {
      subject: 'Abonamentul „{plan}” a expirat',
      title: 'Abonament expirat',
      lines: ['Bună {name},', 'pachetul tău „{plan}” a expirat. Îl poți rezerva din nou oricând din contul tău.'],
      button: 'Alege un pachet',
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

// Pflicht-E-Mails ohne Abschalt-Hinweis
const TRANSACTIONAL = new Set([
  'reset',
  'verifyOk',
  'verifyNo',
  'invoice',
  'invoiceRenew',
  'planActive',
  'planExpired',
]);

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
    footer: TRANSACTIONAL.has(key) ? T[lang].footer : T[lang].footerNotify,
  };
}
