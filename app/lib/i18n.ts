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
  successTitle: "Withdrawal received",
  successMessage:
    "We have received your withdrawal and sent a confirmation to your email.",
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
  successTitle: "Widerruf eingegangen",
  successMessage:
    "Wir haben Ihren Widerruf erhalten und eine Bestätigung an Ihre E-Mail gesendet.",
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
  successTitle: "Rétractation reçue",
  successMessage:
    "Nous avons reçu votre rétractation et envoyé une confirmation à votre e-mail.",
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
  successTitle: "Desistimiento recibido",
  successMessage:
    "Hemos recibido su desistimiento y enviado una confirmación a su correo.",
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
  successTitle: "Recesso ricevuto",
  successMessage:
    "Abbiamo ricevuto il tuo recesso e inviato una conferma alla tua email.",
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
  successTitle: "Herroeping ontvangen",
  successMessage:
    "We hebben uw herroeping ontvangen en een bevestiging naar uw e-mail gestuurd.",
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

/** Returns a complete Strings object for the locale, English-filled. */
export function t(locale?: string | null): Strings {
  const code = normalizeLocale(locale);
  if (full[code]) return full[code];
  return { ...en, ...(partial[code] ?? {}) };
}
