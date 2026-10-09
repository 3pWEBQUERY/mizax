import { OPERATOR as O } from './operator.js';

// Inhalte der Rechtstexte. Aufbau: Abschnitte mit Titel und Blöcken (Absatz-Text oder { list: [...] }).
// Die verbindliche Fassung ist Deutsch.

const address = `${O.name}, ${O.street}, ${O.city}, ${O.country}`;

export const PRIVACY = [
  {
    title: '1. Verantwortliche Stelle',
    body: [
      `Verantwortlich für die Bearbeitung von Personendaten auf dieser Plattform („Mizax“) ist: ${address}. ${O.uid}.`,
      `Bei Fragen zum Datenschutz oder zur Ausübung deiner Rechte erreichst du uns unter ${O.email}.`,
    ],
  },
  {
    title: '2. Grundsätze',
    body: [
      'Wir bearbeiten Personendaten im Einklang mit dem Schweizer Bundesgesetz über den Datenschutz (DSG) und, soweit anwendbar, der EU-Datenschutz-Grundverordnung (DSGVO). Wir erheben nur die Daten, die für den Betrieb der Plattform nötig sind, und verzichten bewusst auf Tracking, Analyse- und Werbedienste.',
    ],
  },
  {
    title: '3. Besuch der Website',
    body: [
      'Beim Aufruf der Website werden technisch bedingt Verbindungsdaten verarbeitet (IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser-Typ). Diese Daten dienen ausschliesslich dem sicheren und stabilen Betrieb (z. B. Abwehr von Angriffen, Fehleranalyse), werden in Server-Protokollen unseres Hosting-Anbieters kurzzeitig gespeichert und nicht mit anderen Daten zusammengeführt.',
    ],
  },
  {
    title: '4. Benutzerkonto',
    body: [
      'Für die Registrierung erheben wir E-Mail-Adresse, Anzeigename, Passwort und den gewählten Kontotyp (Mitglied oder Escort). Das Passwort wird ausschliesslich verschlüsselt (gehasht) gespeichert und ist auch für uns nicht lesbar. Zusätzlich speichern wir die gewählte Sprache, den Zeitpunkt der Registrierung, der Zustimmung zu AGB und Datenschutzerklärung sowie des letzten Logins und deine Favoriten.',
      'Diese Daten benötigen wir, um dir das Konto und die Funktionen der Plattform bereitzustellen.',
    ],
  },
  {
    title: '5. Escort-Profile',
    body: [
      'Escorts können ein Profil veröffentlichen. Dabei werden die selbst eingegebenen Angaben bearbeitet, insbesondere Name bzw. Künstlername, Alter, Ort, Postleitzahl und Kanton, Nationalität, Sprachen, Grösse, Beschreibung, angebotene Leistungen, Honorar, Kontaktangaben (WhatsApp, Telefon, E-Mail) und Fotos.',
      'Fotos, Name, Alter, Ort und Kanton sind öffentlich sichtbar. Beschreibung, Leistungen, Honorar und Kontaktangaben sind nur für angemeldete Mitglieder sichtbar.',
      'Angaben zu angebotenen Leistungen können Rückschlüsse auf das Sexualleben zulassen und gelten damit als besonders schützenswerte Personendaten. Mit dem Ausfüllen und Veröffentlichen des Profils willigst du ausdrücklich in deren Bearbeitung und Veröffentlichung ein. Du kannst diese Einwilligung jederzeit widerrufen, indem du das Profil auf „nicht veröffentlicht“ stellst oder die Löschung verlangst.',
    ],
  },
  {
    title: '6. Standort',
    body: [
      {
        list: [
          'Suche „In meiner Nähe“: Dein Standort wird nur nach einem Klick auf den Button und nach deiner Zustimmung im Browser abgefragt. Die Entfernungen werden direkt in deinem Browser berechnet; dein Standort wird nicht an uns übermittelt und nicht gespeichert.',
          'Escort-Profil „Aktuellen Standort verwenden“: Die Koordinaten werden einmalig an unseren Server gesendet, um den nächstgelegenen Schweizer Ort zu ermitteln, und danach verworfen. Gespeichert und angezeigt werden nur Ort, Postleitzahl, Kanton und das Ortszentrum – nie der genaue Standort.',
          'Für die Ortssuche verwenden wir ein lokal gespeichertes Ortsverzeichnis; es werden keine externen Kartendienste (z. B. Google) abgefragt.',
        ],
      },
    ],
  },
  {
    title: '7. Nachrichten und Kontaktaufnahme',
    body: [
      'Hat ein Escort ein Konto auf Mizax, kannst du ihm direkt über die Plattform schreiben. Dabei speichern wir den Inhalt der Nachrichten, Absender, Empfänger, Zeitpunkt und Lesestatus. Nachrichten sind nur für die beiden Beteiligten sichtbar; wir sehen sie nur ein, wenn dies zur Abwehr von Missbrauch oder aufgrund einer gesetzlichen Pflicht nötig ist.',
      'Für Profile ohne Mizax-Postfach werden Nachrichten nicht über unsere Server versendet. Beim Senden öffnet sich WhatsApp, die SMS-App oder dein E-Mail-Programm. Für die weitere Kommunikation gelten die Datenschutzbestimmungen des jeweiligen Anbieters.',
    ],
  },
  {
    title: '8. Feed, Likes und Kommentare',
    body: [
      'Escorts können im Feed Beiträge mit Text und Fotos veröffentlichen. Angemeldete Mitglieder können Beiträge mit „Gefällt mir“ markieren und kommentieren. Beiträge, Kommentare und Likes sind für alle angemeldeten Mitglieder sichtbar; bei Kommentaren wird dein Anzeigename angezeigt. Du kannst eigene Kommentare jederzeit löschen; Escorts können Beiträge und Kommentare unter ihren Beiträgen löschen.',
    ],
  },
  {
    title: '9. Statistik und Profilbesuche',
    body: [
      'Damit Escorts sehen, wie oft ihr Profil aufgerufen wird, zählen wir Profilaufrufe. Bei angemeldeten Besuchern speichern wir dazu das Konto und den Zeitpunkt des Aufrufs. Bei Gästen speichern wir nur einen täglich wechselnden, nicht umkehrbaren Schlüssel (aus IP-Adresse und Browserkennung berechnet) – die IP-Adresse selbst wird dafür nicht gespeichert. Mehrfache Aufrufe innert 30 Minuten zählen als einer.',
      'Ob Escorts in ihrer Statistik deinen Anzeigenamen sehen, legst du in den Einstellungen unter „Privatsphäre“ fest. Bei Mitgliedern ist dies standardmässig ausgeschaltet; sie erscheinen dann als „Anonymes Mitglied“. Escorts, die ein Mitgliederprofil ansehen, erscheinen in der Statistik des Mitglieds, sofern sie dies nicht ausgeschaltet haben.',
      'Dein Mitgliederprofil (Anzeigename, „Über mich“, Registrierungsmonat) ist nur für Escorts und die Verwaltung sichtbar.',
    ],
  },
  {
    title: '10. Cookies und lokale Speicherung',
    body: [
      'Wir verwenden nur technisch notwendige Speicherungen und keine Tracking- oder Werbe-Cookies:',
      {
        list: [
          'Ein Sitzungs-Cookie („mizax_sid“, HttpOnly, 30 Tage), damit du angemeldet bleibst.',
          'Lokale Speicherung im Browser für deine Altersbestätigung, die gewählte Sprache, das Design (hell/dunkel) und ob die Seitenleiste geöffnet ist.',
        ],
      },
    ],
  },
  {
    title: '11. Spracheingabe',
    body: [
      'Die optionale Spracheingabe im Suchfeld nutzt die Spracherkennung deines Browsers. Je nach Browser kann die Audioaufnahme vom Browser-Hersteller (z. B. Google oder Apple) verarbeitet werden. Wir selbst erhalten nur den erkannten Text. Die Funktion wird nur aktiv, wenn du auf das Mikrofon tippst.',
    ],
  },
  {
    title: '12. Zwecke und Rechtsgrundlagen',
    body: [
      'Wir bearbeiten deine Daten zur Bereitstellung der Plattform und deines Kontos, zur Veröffentlichung von Profilen, zur Gewährleistung von Sicherheit und Missbrauchsprävention sowie zur Erfüllung gesetzlicher Pflichten. Soweit die DSGVO anwendbar ist, stützen wir uns auf Art. 6 Abs. 1 lit. b (Vertrag), lit. c (rechtliche Pflicht), lit. f (berechtigtes Interesse an einem sicheren Betrieb) sowie für besonders schützenswerte Angaben auf Art. 9 Abs. 2 lit. a und e DSGVO (ausdrückliche Einwilligung bzw. offensichtlich öffentlich gemachte Daten).',
    ],
  },
  {
    title: '13. Empfänger und Hosting',
    body: [
      'Die Plattform, die Datenbank und die Fotos werden bei Railway Corporation (USA) gehostet; die Server und der Speicher befinden sich in Europa (Amsterdam, Niederlande). Railway bearbeitet die Daten ausschliesslich in unserem Auftrag. Soweit dabei ein Zugriff aus den USA möglich ist, erfolgt dieser auf Grundlage geeigneter Garantien (insbesondere Standardvertragsklauseln).',
      'Eine Weitergabe an sonstige Dritte findet nicht statt, ausser wir sind gesetzlich dazu verpflichtet (z. B. auf behördliche Anordnung).',
    ],
  },
  {
    title: '14. Aufbewahrung',
    body: [
      'Kontodaten, Profile, Nachrichten, Beiträge und Statistikdaten speichern wir, solange dein Konto besteht. Du kannst dein Konto jederzeit selbst in den Einstellungen löschen; dabei werden Konto, Profil, Fotos, Beiträge, Kommentare, Likes, Favoriten und Unterhaltungen sofort entfernt. Verbleibende Kopien in Sicherungen werden innert 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Server-Protokolle werden nach kurzer Zeit automatisch gelöscht.',
    ],
  },
  {
    title: '15. Datensicherheit',
    body: [
      'Die Übertragung erfolgt verschlüsselt (HTTPS). Passwörter werden mit einem modernen Hash-Verfahren gespeichert, das Sitzungs-Cookie ist für Skripte nicht lesbar. Zugriff auf die Verwaltung haben nur berechtigte Administratoren.',
    ],
  },
  {
    title: '16. Deine Rechte',
    body: [
      `Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Bearbeitung, Datenherausgabe bzw. -übertragung sowie auf Widerspruch und Widerruf erteilter Einwilligungen. Wende dich dafür an ${O.email}. Zudem kannst du dich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) bzw. bei der zuständigen Aufsichtsbehörde in deinem EU-Land beschweren.`,
    ],
  },
  {
    title: '17. Minderjährige',
    body: [
      'Die Plattform richtet sich ausschliesslich an volljährige Personen (18+). Wir bearbeiten wissentlich keine Daten von Minderjährigen und löschen solche Konten umgehend.',
    ],
  },
  {
    title: '18. Quellen',
    body: [
      'Ortsdaten (Postleitzahlen, Orte, Kantone, Koordinaten): © GeoNames (www.geonames.org), lizenziert unter Creative Commons Attribution 4.0 (CC BY 4.0).',
    ],
  },
  {
    title: '19. Änderungen',
    body: [
      'Wir können diese Datenschutzerklärung anpassen, wenn sich die Plattform oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.',
    ],
  },
];

export const TERMS = [
  {
    title: '1. Geltungsbereich und Anbieter',
    body: [
      `Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform „Mizax“, betrieben von ${address}. Mit der Registrierung bzw. der Nutzung der Plattform akzeptierst du diese AGB.`,
    ],
  },
  {
    title: '2. Leistungen der Plattform',
    body: [
      'Mizax ist eine Werbe- und Informationsplattform, auf der volljährige Escorts eigenverantwortlich Profile und Beiträge (Feed) veröffentlichen und Mitglieder diese ansehen, kommentieren und Escorts über die Plattform Nachrichten senden können.',
      'Mizax vermittelt keine Dienstleistungen, ist nicht Vertragspartei zwischen Mitgliedern und Escorts und erhält keine Beteiligung an Vereinbarungen zwischen ihnen. Absprachen, Treffen und Zahlungen erfolgen ausschliesslich zwischen den Beteiligten und in deren eigener Verantwortung.',
      'Die Nutzung ist derzeit kostenlos. Allfällige kostenpflichtige Zusatzleistungen werden vorgängig klar ausgewiesen und gesondert vereinbart.',
    ],
  },
  {
    title: '3. Zugang und Registrierung',
    body: [
      {
        list: [
          'Die Nutzung ist nur Personen ab 18 Jahren gestattet.',
          'Bei der Registrierung sind wahrheitsgemässe Angaben zu machen. Pro Person ist ein Konto zulässig.',
          'Zugangsdaten sind geheim zu halten. Du bist für alle Aktivitäten unter deinem Konto verantwortlich und informierst uns umgehend bei Verdacht auf Missbrauch.',
        ],
      },
    ],
  },
  {
    title: '4. Pflichten von Escorts',
    body: [
      'Wer als Escort ein Profil veröffentlicht, bestätigt und gewährleistet insbesondere, dass:',
      {
        list: [
          'die Person volljährig ist und die Tätigkeit freiwillig, selbstbestimmt und auf eigene Rechnung ausübt;',
          'alle Angaben im Profil wahr und aktuell sind;',
          'nur eigene Fotos verwendet werden, an denen alle erforderlichen Rechte bestehen, und auf den Fotos keine anderen Personen ohne deren Einwilligung erkennbar sind;',
          'alle anwendbaren Vorschriften eingehalten werden, insbesondere kantonale Bewilligungs- und Meldepflichten, ausländer- und steuerrechtliche Pflichten;',
          'nur eigene Kontaktangaben angegeben werden.',
        ],
      },
    ],
  },
  {
    title: '5. Verbotene Inhalte und Verhalten',
    body: [
      'Untersagt sind insbesondere:',
      {
        list: [
          'jegliche Inhalte mit oder im Bezug auf Minderjährige;',
          'Inhalte, die auf Zwang, Ausbeutung oder Menschenhandel hindeuten;',
          'rechtswidrige, gewaltverherrlichende, diskriminierende oder beleidigende Inhalte;',
          'Fotos oder Texte Dritter ohne Berechtigung sowie die Verletzung von Urheber- und Persönlichkeitsrechten;',
          'Spam, Fake-Profile, Täuschung sowie das Belästigen oder Bedrohen anderer Nutzer;',
          'technische Angriffe, automatisiertes Auslesen der Plattform oder Umgehen von Schutzmassnahmen.',
        ],
      },
      'Verdachtsfälle von Minderjährigkeit, Zwang oder Menschenhandel melden wir den zuständigen Behörden.',
    ],
  },
  {
    title: '6. Prüfung, Moderation und Sperrung',
    body: [
      'Wir dürfen Profile und Inhalte prüfen, ohne Vorankündigung ganz oder teilweise entfernen, die Veröffentlichung aussetzen sowie Konten sperren oder löschen, wenn ein Verstoss gegen diese AGB oder geltendes Recht vorliegt oder vermutet wird.',
      'Die Kennzeichnung „Verifiziert“ bedeutet lediglich, dass wir eine Prüfung des Profils vorgenommen haben. Sie stellt keine Garantie für die Richtigkeit aller Angaben oder für das Verhalten der Person dar.',
    ],
  },
  {
    title: '7. Rechte an Inhalten',
    body: [
      'Escorts bleiben Inhaber der Rechte an ihren Texten und Fotos. Sie räumen Mizax für die Dauer der Veröffentlichung ein unentgeltliches, nicht exklusives Recht ein, diese Inhalte auf der Plattform darzustellen und dafür technisch zu bearbeiten (z. B. Grössenanpassung, Komprimierung).',
      'Die Gestaltung und Software der Plattform sind urheberrechtlich geschützt.',
    ],
  },
  {
    title: '8. Haftung',
    body: [
      'Für Inhalte, Angaben und Verhalten der Nutzer übernimmt Mizax keine Gewähr und keine Haftung. Wir bemühen uns um einen störungsfreien Betrieb, können aber keine ständige Verfügbarkeit garantieren.',
      'Soweit gesetzlich zulässig, ist die Haftung von Mizax auf Vorsatz und grobe Fahrlässigkeit beschränkt.',
    ],
  },
  {
    title: '9. Beendigung und Löschung',
    body: [
      `Du kannst dein Konto jederzeit selbst in den Einstellungen löschen oder löschen lassen; eine Nachricht an ${O.email} genügt. Escorts können ihr Profil zudem jederzeit selbst auf „nicht veröffentlicht“ stellen. Wir können die Nutzung bei Verstössen jederzeit beenden.`,
    ],
  },
  {
    title: '10. Datenschutz',
    body: [
      'Informationen zur Bearbeitung deiner Personendaten findest du in unserer Datenschutzerklärung.',
    ],
  },
  {
    title: '11. Änderungen der AGB',
    body: [
      'Wir können diese AGB anpassen. Über wesentliche Änderungen informieren wir registrierte Nutzer in geeigneter Form. Die weitere Nutzung nach Inkrafttreten gilt als Zustimmung.',
    ],
  },
  {
    title: '12. Anwendbares Recht und Gerichtsstand',
    body: [
      `Es gilt ausschliesslich Schweizer Recht unter Ausschluss des Kollisionsrechts. Gerichtsstand ist ${O.venue}, soweit nicht zwingende Bestimmungen (z. B. zum Konsumentenschutz) etwas anderes vorsehen.`,
    ],
  },
];
