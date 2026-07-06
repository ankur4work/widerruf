/**
 * EU withdrawal i18n.
 *
 * The two legally-significant labels (Art. 11a CRD) must be unambiguous:
 *   - withdrawButton  → e.g. "Withdraw from contract" / "Vertrag widerrufen"
 *   - confirmButton   → e.g. "Confirm withdrawal" / "Widerruf bestätigen"
 *
 * UI strings fall back to English when a locale is partially translated.
 * NOTE: legal wording should be reviewed per market before launch.
 */

export interface Strings {
  withdrawButton: string; // the persistent storefront button label
  confirmButton: string; // step-2 confirmation button
  formTitle: string;
  intro: string;
  nameLabel: string;
  emailLabel: string;
  orderLabel: string;
  itemsLabel: string;
  itemsHelp: string;
  continueButton: string;
  backButton: string;
  reviewTitle: string;
  reviewHint: string;
  successTitle: string;
  successMessage: string;
  required: string;
  invalidEmail: string;
}

const en: Strings = {
  withdrawButton: "Withdraw from contract",
  confirmButton: "Confirm withdrawal",
  formTitle: "Withdraw from contract",
  intro:
    "Use this form to exercise your right of withdrawal. You do not need an account.",
  nameLabel: "Your name",
  emailLabel: "Email address",
  orderLabel: "Order number",
  itemsLabel: "Items / services to withdraw",
  itemsHelp: "Describe the product(s) or service(s) you wish to withdraw from.",
  continueButton: "Continue",
  backButton: "Back",
  reviewTitle: "Confirm your withdrawal",
  reviewHint: "Please review your details, then confirm.",
  successTitle: "Withdrawal request received",
  successMessage:
    "We've received your withdrawal request and emailed you this confirmation. After we review it, you'll receive another email confirming whether it has been accepted or declined.",
  required: "This field is required.",
  invalidEmail: "Please enter a valid email address.",
};

// Full translations for the largest EU markets
const de: Strings = {
  withdrawButton: "Vertrag widerrufen",
  confirmButton: "Widerruf bestätigen",
  formTitle: "Vertrag widerrufen",
  intro:
    "Mit diesem Formular üben Sie Ihr Widerrufsrecht aus. Ein Konto ist nicht erforderlich.",
  nameLabel: "Ihr Name",
  emailLabel: "E-Mail-Adresse",
  orderLabel: "Bestellnummer",
  itemsLabel: "Zu widerrufende Artikel / Leistungen",
  itemsHelp:
    "Beschreiben Sie die Produkte oder Dienstleistungen, die Sie widerrufen möchten.",
  continueButton: "Weiter",
  backButton: "Zurück",
  reviewTitle: "Widerruf bestätigen",
  reviewHint: "Bitte prüfen Sie Ihre Angaben und bestätigen Sie.",
  successTitle: "Widerrufsantrag eingegangen",
  successMessage:
    "Wir haben Ihren Widerrufsantrag erhalten und Ihnen diese Bestätigung per E-Mail gesendet. Nach der Prüfung erhalten Sie eine weitere E-Mail, ob der Widerruf angenommen oder abgelehnt wurde.",
  required: "Dieses Feld ist erforderlich.",
  invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
};

const fr: Strings = {
  withdrawButton: "Se rétracter du contrat",
  confirmButton: "Confirmer la rétractation",
  formTitle: "Se rétracter du contrat",
  intro:
    "Utilisez ce formulaire pour exercer votre droit de rétractation. Aucun compte n'est nécessaire.",
  nameLabel: "Votre nom",
  emailLabel: "Adresse e-mail",
  orderLabel: "Numéro de commande",
  itemsLabel: "Articles / services à rétracter",
  itemsHelp:
    "Décrivez le(s) produit(s) ou service(s) que vous souhaitez rétracter.",
  continueButton: "Continuer",
  backButton: "Retour",
  reviewTitle: "Confirmer votre rétractation",
  reviewHint: "Veuillez vérifier vos informations, puis confirmer.",
  successTitle: "Demande de rétractation reçue",
  successMessage:
    "Nous avons reçu votre demande de rétractation et vous avons envoyé cette confirmation par e-mail. Après examen, vous recevrez un autre e-mail indiquant si elle a été acceptée ou refusée.",
  required: "Ce champ est obligatoire.",
  invalidEmail: "Veuillez saisir une adresse e-mail valide.",
};

const es: Strings = {
  withdrawButton: "Desistir del contrato",
  confirmButton: "Confirmar el desistimiento",
  formTitle: "Desistir del contrato",
  intro:
    "Use este formulario para ejercer su derecho de desistimiento. No necesita una cuenta.",
  nameLabel: "Su nombre",
  emailLabel: "Correo electrónico",
  orderLabel: "Número de pedido",
  itemsLabel: "Artículos / servicios a desistir",
  itemsHelp:
    "Describa los productos o servicios de los que desea desistir.",
  continueButton: "Continuar",
  backButton: "Atrás",
  reviewTitle: "Confirme su desistimiento",
  reviewHint: "Revise sus datos y confirme.",
  successTitle: "Solicitud de desistimiento recibida",
  successMessage:
    "Hemos recibido su solicitud de desistimiento y le hemos enviado esta confirmación por correo. Tras revisarla, recibirá otro correo indicando si ha sido aceptada o rechazada.",
  required: "Este campo es obligatorio.",
  invalidEmail: "Introduzca una dirección de correo válida.",
};

const it: Strings = {
  withdrawButton: "Recedere dal contratto",
  confirmButton: "Conferma il recesso",
  formTitle: "Recedere dal contratto",
  intro:
    "Usa questo modulo per esercitare il tuo diritto di recesso. Non serve un account.",
  nameLabel: "Il tuo nome",
  emailLabel: "Indirizzo email",
  orderLabel: "Numero d'ordine",
  itemsLabel: "Articoli / servizi da recedere",
  itemsHelp:
    "Descrivi i prodotti o servizi per cui desideri recedere.",
  continueButton: "Continua",
  backButton: "Indietro",
  reviewTitle: "Conferma il tuo recesso",
  reviewHint: "Controlla i tuoi dati e conferma.",
  successTitle: "Richiesta di recesso ricevuta",
  successMessage:
    "Abbiamo ricevuto la tua richiesta di recesso e ti abbiamo inviato questa conferma via email. Dopo la verifica, riceverai un'altra email che indica se è stata accettata o rifiutata.",
  required: "Questo campo è obbligatorio.",
  invalidEmail: "Inserisci un indirizzo email valido.",
};

const nl: Strings = {
  withdrawButton: "Overeenkomst herroepen",
  confirmButton: "Herroeping bevestigen",
  formTitle: "Overeenkomst herroepen",
  intro:
    "Gebruik dit formulier om uw herroepingsrecht uit te oefenen. Een account is niet nodig.",
  nameLabel: "Uw naam",
  emailLabel: "E-mailadres",
  orderLabel: "Bestelnummer",
  itemsLabel: "Te herroepen artikelen / diensten",
  itemsHelp:
    "Beschrijf de producten of diensten die u wilt herroepen.",
  continueButton: "Doorgaan",
  backButton: "Terug",
  reviewTitle: "Bevestig uw herroeping",
  reviewHint: "Controleer uw gegevens en bevestig.",
  successTitle: "Herroepingsverzoek ontvangen",
  successMessage:
    "We hebben uw herroepingsverzoek ontvangen en u deze bevestiging per e-mail gestuurd. Na beoordeling ontvangt u nog een e-mail of het is geaccepteerd of afgewezen.",
  required: "Dit veld is verplicht.",
  invalidEmail: "Voer een geldig e-mailadres in.",
};

// Legally-significant labels for the remaining EU official languages.
// UI strings fall back to English until fully translated.
const partial: Record<string, Partial<Strings>> = {
  pl: { withdrawButton: "Odstąp od umowy", confirmButton: "Potwierdź odstąpienie", formTitle: "Odstąp od umowy" },
  pt: { withdrawButton: "Rescindir o contrato", confirmButton: "Confirmar a rescisão", formTitle: "Rescindir o contrato" },
  sv: { withdrawButton: "Frånträd avtalet", confirmButton: "Bekräfta frånträdande", formTitle: "Frånträd avtalet" },
  da: { withdrawButton: "Fortryd aftalen", confirmButton: "Bekræft fortrydelse", formTitle: "Fortryd aftalen" },
  fi: { withdrawButton: "Peru sopimus", confirmButton: "Vahvista peruutus", formTitle: "Peru sopimus" },
  cs: { withdrawButton: "Odstoupit od smlouvy", confirmButton: "Potvrdit odstoupení", formTitle: "Odstoupit od smlouvy" },
  sk: { withdrawButton: "Odstúpiť od zmluvy", confirmButton: "Potvrdiť odstúpenie", formTitle: "Odstúpiť od zmluvy" },
  ro: { withdrawButton: "Retragere din contract", confirmButton: "Confirmă retragerea", formTitle: "Retragere din contract" },
  hu: { withdrawButton: "Elállás a szerződéstől", confirmButton: "Elállás megerősítése", formTitle: "Elállás a szerződéstől" },
  el: { withdrawButton: "Υπαναχώρηση από τη σύμβαση", confirmButton: "Επιβεβαίωση υπαναχώρησης", formTitle: "Υπαναχώρηση από τη σύμβαση" },
  bg: { withdrawButton: "Отказ от договора", confirmButton: "Потвърди отказа", formTitle: "Отказ от договора" },
  hr: { withdrawButton: "Odustani od ugovora", confirmButton: "Potvrdi odustajanje", formTitle: "Odustani od ugovora" },
  sl: { withdrawButton: "Odstop od pogodbe", confirmButton: "Potrdi odstop", formTitle: "Odstop od pogodbe" },
  et: { withdrawButton: "Lepingust taganemine", confirmButton: "Kinnita taganemine", formTitle: "Lepingust taganemine" },
  lv: { withdrawButton: "Atteikties no līguma", confirmButton: "Apstiprināt atteikumu", formTitle: "Atteikties no līguma" },
  lt: { withdrawButton: "Atsisakyti sutarties", confirmButton: "Patvirtinti atsisakymą", formTitle: "Atsisakyti sutarties" },
  ga: { withdrawButton: "Tarraing siar ón gconradh", confirmButton: "Deimhnigh an tarraingt siar", formTitle: "Tarraing siar ón gconradh" },
  mt: { withdrawButton: "Irtira mill-kuntratt", confirmButton: "Ikkonferma l-irtirar", formTitle: "Irtira mill-kuntratt" },
};

const full: Record<string, Strings> = { en, de, fr, es, it, nl };

export const SUPPORTED_LOCALES = [
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "ga", "hr",
  "hu", "it", "lt", "lv", "mt", "nl", "pl", "pt", "ro", "sk", "sl", "sv",
];

export function normalizeLocale(input?: string | null): string {
  if (!input) return "en";
  const code = input.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(code) ? code : "en";
}

// ---------------------------------------------------------------------------
// Withdrawal reasons (optional field → powers analytics).
// Codes are stable/language-independent; labels are localized (en/de, else en).
// ---------------------------------------------------------------------------

export const WITHDRAWAL_REASON_CODES = [
  "CHANGED_MIND",
  "BETTER_PRICE",
  "ARRIVED_LATE",
  "NOT_AS_DESCRIBED",
  "DAMAGED",
  "WRONG_ITEM",
  "QUALITY",
  "NO_LONGER_NEEDED",
  "OTHER",
] as const;

export type WithdrawalReasonCode = (typeof WITHDRAWAL_REASON_CODES)[number];

const REASON_LABELS: Record<string, Record<WithdrawalReasonCode, string>> = {
  en: {
    CHANGED_MIND: "Changed my mind",
    BETTER_PRICE: "Found a better price elsewhere",
    ARRIVED_LATE: "Arrived too late",
    NOT_AS_DESCRIBED: "Not as described",
    DAMAGED: "Damaged or defective",
    WRONG_ITEM: "Wrong item received",
    QUALITY: "Quality not as expected",
    NO_LONGER_NEEDED: "No longer needed",
    OTHER: "Other",
  },
  de: {
    CHANGED_MIND: "Meinung geändert",
    BETTER_PRICE: "Woanders günstiger gefunden",
    ARRIVED_LATE: "Zu spät geliefert",
    NOT_AS_DESCRIBED: "Nicht wie beschrieben",
    DAMAGED: "Beschädigt oder defekt",
    WRONG_ITEM: "Falscher Artikel erhalten",
    QUALITY: "Qualität nicht wie erwartet",
    NO_LONGER_NEEDED: "Wird nicht mehr benötigt",
    OTHER: "Sonstiges",
  },
};

// Form microcopy for the reason field (en/de, else en).
const REASON_UI: Record<string, { label: string; help: string; placeholder: string }> = {
  en: {
    label: "Reason for withdrawal (optional)",
    help: "This helps the store improve. It does not affect your right of withdrawal.",
    placeholder: "Select a reason…",
  },
  de: {
    label: "Grund für den Widerruf (optional)",
    help: "Das hilft dem Shop, sich zu verbessern. Ihr Widerrufsrecht bleibt davon unberührt.",
    placeholder: "Grund auswählen…",
  },
};

export function isReasonCode(v?: string | null): v is WithdrawalReasonCode {
  return !!v && (WITHDRAWAL_REASON_CODES as readonly string[]).includes(v);
}

/** Localized label for a reason code (falls back to en, then the raw code). */
export function reasonLabel(code?: string | null, locale?: string | null): string {
  if (!code) return "";
  const lang = normalizeLocale(locale);
  const table = REASON_LABELS[lang] || REASON_LABELS.en;
  return table[code as WithdrawalReasonCode] || REASON_LABELS.en[code as WithdrawalReasonCode] || code;
}

/** Ordered {code,label} options for a locale. */
export function reasonOptions(locale?: string | null): { code: WithdrawalReasonCode; label: string }[] {
  return WITHDRAWAL_REASON_CODES.map((code) => ({ code, label: reasonLabel(code, locale) }));
}

/** Form microcopy for the reason field. */
export function reasonUi(locale?: string | null) {
  return REASON_UI[normalizeLocale(locale)] || REASON_UI.en;
}

/** Returns a complete Strings object for the locale, English-filled. */
export function t(locale?: string | null): Strings {
  const code = normalizeLocale(locale);
  if (full[code]) return full[code];
  return { ...en, ...(partial[code] ?? {}) };
}
