/**
 * Admin-editable wording for the fixed text around dynamic data: the tour
 * page, the booking flow, and the blog and testimonials pages. Tour content
 * itself (itinerary, prices, dates) stays on the tour document.
 *
 * Free of "server-only" because BookingForm and the tour preview import it
 * from the client. Every default is the copy that was hardcoded before this
 * editor existed, so the site renders the same until someone saves a change.
 */

export interface CopyField {
  key: string;
  label: string;
  multiline?: boolean;
  /** May be saved blank. Everything else is required. */
  optional?: boolean;
  /** A photo picker (upload or library) instead of a text box; the value is the image URL, blank = no image. */
  image?: boolean;
  /** Values filled in at render time, written as {name} in the text. */
  placeholders?: string[];
}

export interface CopySection {
  title: string;
  description?: string;
  fields: CopyField[];
}

/** Replaces each {name} with its value; unknown names are left as written. */
export function fillCopy(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
}

export function placeholdersIn(text: string): string[] {
  return Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1]);
}

export const TOUR_PAGE_COPY_DEFAULTS = {
  navOverview: "סקירה",
  navItinerary: "מסלול",
  navGuides: "המדריכים",
  navIncluded: "מה כלול",
  navDownloads: "להורדה",
  navTestimonials: "המלצות",
  navCancellation: "מדיניות ביטול",
  navDates: "תאריכים והרשמה",

  heroDays: "{days} ימים",
  heroMorePhotos: "+{count} תמונות",

  overviewHeading: "סקירה",
  durationLabel: "משך",
  durationValue: "{days} ימים / {nights} לילות",
  groupSizeLabel: "גודל קבוצה",
  groupSizeValue: "החל מ-{count} מטיילים",
  groupSizeFallback: "קבוצות קטנות",
  countriesLabel: "מדינות",

  itineraryHeading: "המסלול יום אחר יום",
  attractionsLabel: "אטרקציות:",
  mealsLabel: "ארוחות:",

  guidesHeading: "המדריכים שלכם",
  guideLeadingLabel: "מוביל/ה",

  kashrutDefaultTitle: "כשרות",
  supervisionLabel: "השגחה",
  patYisraelLabel: "פת ישראל",
  chalavYisraelLabel: "חלב ישראל",
  kashrutGuaranteed: "מובטח",
  kashrutNotGuaranteed: "לא מובטח בכל היעדים",
  kashrutNotOffered: "לא קיים",

  importantToKnowHeading: "חשוב לדעת",
  includedHeading: "מה כלול",
  notIncludedHeading: "לא כלול",
  testimonialsHeading: "מה אומרים המטיילים",
  testimonialsLink: "לכל ההמלצות",
  cancellationHeading: "מדיניות ביטול",

  priceLabel: "החל מ-",
  perPersonLabel: "/ לאדם",
  priceNote: "בחדר זוגי · {singlePrice} לאדם בחדר יחיד",
  priceSupplement: "+{supplement}",
  flightsHighlight: "כולל טיסות",
  kosherHighlight: "תוכנית כשרה מלאה",
  departuresHeading: "מועדי יציאה",
  noDatesMessage: "המועד הבא לטיול זה יפורסם בקרוב.",
  guideLabel: "מדריך:",
  bookButton: "להרשמה",
  callPrefix: "התקשרו",
  depositNote: "הבטיחו את מקומכם במקדמה של {deposit} לאדם. היתרה לתשלום {days} ימים לפני היציאה.",
  noDepositNote: "הבטיחו את מקומכם ללא מקדמה. היתרה לתשלום {days} ימים לפני היציאה.",

  statusSoldOut: "אזל",
  statusCancelled: "בוטל",
  statusLowSeats: "נותרו {seats} מקומות בלבד",
  statusAvailable: "פתוח להרשמה",
};

export type TourPageCopy = typeof TOUR_PAGE_COPY_DEFAULTS;

/** The availability wording shared by the tour page and the booking form's date step. */
export type DepartureStatusCopy = Pick<
  TourPageCopy,
  "statusSoldOut" | "statusCancelled" | "statusLowSeats" | "statusAvailable"
>;

export const TOUR_PAGE_COPY_SECTIONS: CopySection[] = [
  {
    title: "Booking card",
    description: "The price and dates panel beside the tour. The amounts come from each tour's pricing.",
    fields: [
      { key: "priceLabel", label: "Above the price" },
      { key: "perPersonLabel", label: "After the price" },
      { key: "priceNote", label: "Note under the price", multiline: true, placeholders: ["singlePrice"] },
      { key: "priceSupplement", label: "Single supplement, after the note", optional: true, placeholders: ["supplement"] },
      { key: "flightsHighlight", label: "Highlight when flights are included", optional: true },
      { key: "kosherHighlight", label: "Kosher highlight", optional: true },
      { key: "departuresHeading", label: "Dates heading" },
      { key: "noDatesMessage", label: "Message when there are no dates", multiline: true },
      { key: "guideLabel", label: "Before the guide's name" },
      { key: "bookButton", label: "Book button" },
      { key: "callPrefix", label: "Before the phone number" },
      { key: "depositNote", label: "Deposit note", multiline: true, placeholders: ["deposit", "days"] },
      { key: "noDepositNote", label: "Deposit note when the tour has no deposit", multiline: true, placeholders: ["days"] },
    ],
  },
  {
    title: "Date availability",
    description: "Also shown on the first step of the booking form.",
    fields: [
      { key: "statusAvailable", label: "Available" },
      { key: "statusLowSeats", label: "Few seats left", placeholders: ["seats"] },
      { key: "statusSoldOut", label: "Sold out" },
      { key: "statusCancelled", label: "Cancelled" },
    ],
  },
  {
    title: "Section tabs",
    description: "The strip of links under the photos.",
    fields: [
      { key: "navOverview", label: "Overview" },
      { key: "navItinerary", label: "Itinerary" },
      { key: "navGuides", label: "Guides" },
      { key: "navIncluded", label: "What's included" },
      { key: "navDownloads", label: "Downloads (PDF files)" },
      { key: "navTestimonials", label: "Testimonials" },
      { key: "navCancellation", label: "Cancellation" },
      { key: "navDates", label: "Dates (mobile only)" },
    ],
  },
  {
    title: "Photos and overview",
    fields: [
      { key: "heroDays", label: "Length, on the main photo", placeholders: ["days"] },
      { key: "heroMorePhotos", label: "More photos tile", placeholders: ["count"] },
      { key: "overviewHeading", label: "Overview heading" },
      { key: "durationLabel", label: "Duration label" },
      { key: "durationValue", label: "Duration value", placeholders: ["days", "nights"] },
      { key: "groupSizeLabel", label: "Group size label" },
      { key: "groupSizeValue", label: "Group size value", placeholders: ["count"] },
      { key: "groupSizeFallback", label: "Group size when no minimum is set" },
      { key: "countriesLabel", label: "Countries label" },
    ],
  },
  {
    title: "Itinerary and guides",
    fields: [
      { key: "itineraryHeading", label: "Itinerary heading" },
      { key: "attractionsLabel", label: "Attractions label" },
      { key: "mealsLabel", label: "Meals label" },
      { key: "guidesHeading", label: "Guides heading" },
      { key: "guideLeadingLabel", label: "Before a guide's dates" },
    ],
  },
  {
    title: "Kashrut",
    description: "A tour's own kashrut title, when set, replaces the default title.",
    fields: [
      { key: "kashrutDefaultTitle", label: "Default title" },
      { key: "supervisionLabel", label: "Supervision label" },
      { key: "patYisraelLabel", label: "Pat Yisrael label" },
      { key: "chalavYisraelLabel", label: "Chalav Yisrael label" },
      { key: "kashrutGuaranteed", label: "Status: guaranteed" },
      { key: "kashrutNotGuaranteed", label: "Status: not guaranteed" },
      { key: "kashrutNotOffered", label: "Status: not offered" },
    ],
  },
  {
    title: "Other headings",
    fields: [
      { key: "importantToKnowHeading", label: "Important to know" },
      { key: "includedHeading", label: "What's included" },
      { key: "notIncludedHeading", label: "Not included" },
      { key: "testimonialsHeading", label: "Testimonials" },
      { key: "testimonialsLink", label: "Link to all testimonials" },
      { key: "cancellationHeading", label: "Cancellation policy" },
    ],
  },
];

export const BOOKING_COPY_DEFAULTS = {
  headerEyebrow: "הרשמה",
  headerLede: "שריינו את מקומכם — בחרו מועד, מספר משתתפים ופרטי המטיילים.",
  noDatesMessage: "המועד הבא לטיול זה יפורסם בקרוב. התקשרו אלינו ל-{phone} ונעדכן אתכם ברגע שייפתח.",
  noOpenDatesMessage: "אין כרגע מועדים פתוחים לטיול זה. התקשרו אלינו ל-{phone} ונעזור לכם למצוא את הטיול המתאים.",

  stepDates: "מועד",
  stepParty: "משתתפים",
  stepTravelers: "מטיילים",
  stepContact: "פרטי קשר",
  stepReview: "סיכום",
  continueButton: "המשך",
  backButton: "חזרה",

  datesHeading: "בחרו מועד יציאה",
  assuranceGuaranteed: "יציאה מובטחת",
  assuranceConditional: "בכפוף למספר נרשמים",

  partyHeading: "משתתפים וחדרים",
  doubleRooms: "חדרים זוגיים",
  doubleHint: "2 מבוגרים בכל חדר",
  singleRooms: "חדרים ליחיד",
  singleHint: "מבוגר אחד בכל חדר",
  singleHintSupplement: "מבוגר אחד בכל חדר · +{supplement}",
  tripleRooms: "חדרים לשלושה",
  tripleHint: "3 מבוגרים בכל חדר",
  children: "ילדים",
  travelerSingular: "מטייל",
  travelerPlural: "מטיילים",
  estimatedTotal: "סה\"כ משוער",
  guaranteedPartyNote: "יציאה זו מובטחת — נדרש תשלום מלא כדי לשריין את מקומכם.",
  depositNote: "מקדמה מינימלית: {deposit} — את הסכום לתשלום תבחרו בשלב הבא.",
  noDepositNote: "אין צורך במקדמה כדי לשריין את מקומכם.",
  seatsWarning: "נותרו רק {seats} {spots} במועד זה — הפחיתו את מספר המשתתפים או בחרו מועד אחר.",

  travelersHeading: "פרטי המטיילים",
  travelerCard: "מטייל {number}",
  firstName: "שם פרטי",
  lastName: "שם משפחה",
  dateOfBirth: "תאריך לידה",
  passportNumber: "מספר דרכון",
  roomingWith: "חולק/ת חדר עם",
  dietaryNeeds: "העדפות תזונה",
  passportScan: "צילום דרכון",
  passportScanOptional: "(לא חובה)",
  uploadButton: "העלאת תמונה או PDF",
  uploadingLabel: "מעלה…",
  passportUploaded: "הדרכון הועלה",
  removeButton: "הסרה",
  secureUploadTitle: "העלאה מאובטחת",
  secureUploadBody: "— מוצפן בהעברה ובאחסון, נשמר באופן פרטי ללא קישור ציבורי. רק צוות טיולי גשר יכול לצפות בו.",

  contactHeading: "פרטי קשר",
  contactName: "שם מלא",
  contactEmail: "אימייל",
  contactPhone: "טלפון",

  reviewHeading: "סיכום ושליחה",
  reviewDeparture: "מועד יציאה",
  reviewTravelers: "מטיילים",
  reviewBalance: "יתרה לתשלום",
  reviewBalanceValue: "{amount} — {days} ימים לפני היציאה",
  guaranteedReviewNote: "יציאה זו מובטחת — נדרש תשלום מלא של {total} כדי לשריין את מקומכם.",
  offlineTitle: "לא מתבצע תשלום באתר",
  offlineBody: "הירשמו עכשיו ונציג יחזור אליכם תוך יום עסקים אחד לאישור הפרטים ולהסדרת התשלום.",
  paymentChoiceHeading: "איך תרצו להשלים את התשלום?",
  callbackTitle: "נציג יחזור אליי",
  callbackBody: "ניצור קשר תוך יום עסקים אחד להסדרת התשלום.",
  payOnlineTitle: "אני רוצה לשלם באתר",
  payOnlineBody: "תשלום מאובטח בכרטיס אשראי מיד לאחר השליחה.",
  paymentAmountLabel: "כמה תרצו לשלם עכשיו?",
  paymentMinLabel: "מקדמה",
  noDepositLabel: "ללא מקדמה",
  paymentMaxLabel: "מחיר מלא",
  cancellationHeading: "מדיניות ביטול",
  cancellationTier: "{days}+ ימי עבודה לפני היציאה: דמי ביטול {percent}%",
  cancellationFee: "בתוספת דמי טיפול של {fee}.",
  submitOnline: "שליחת ההרשמה",
  submitOffline: "להרשמה — נחזור אליכם",
  submitting: "שולח…",

  paymentHeading: "השלמת התשלום",
  paymentBody: "ההרשמה שלכם נשמרה. השלימו את התשלום של {amount} כדי לאשר את מקומכם.",

  confirmationEyebrow: "ההרשמה התקבלה",
  confirmationHeading: "נשמח לארח אתכם",
  confirmationCallback: "תודה! נציג מהצוות שלנו יחזור אליכם תוך יום עסקים אחד לאישור הפרטים ולהסדרת התשלום.",
  confirmationPaid: "תודה! התשלום התקבל ומקומכם מובטח.",
  confirmationPaymentFailed: "תודה! לא הצלחנו להתחיל את התשלום באתר כרגע, אבל ההרשמה שלכם נשמרה — נציג יחזור אליכם בקרוב להסדרת התשלום.",
  questionsPrefix: "שאלות? התקשרו",

  successEyebrow: "הרשמה",
  successTitle: "התשלום התקבל",
  successLede: "תודה — המקדמה שלכם אושרה.",
  successBadge: "המקדמה התקבלה",
  successHeading: "נשמח לארח אתכם",
  successPaid: "שולם עד כה",
  successTotal: "סה\"כ לטיול",
  successHomeLink: "חזרה לדף הבית",
};

export type BookingCopy = typeof BOOKING_COPY_DEFAULTS;

export const BOOKING_COPY_SECTIONS: CopySection[] = [
  {
    title: "Page header",
    description: "{phone} becomes a tappable link to the number in Settings.",
    fields: [
      { key: "headerEyebrow", label: "Small text above the tour name" },
      { key: "headerLede", label: "Intro", multiline: true },
      { key: "noDatesMessage", label: "Message when no dates are published", multiline: true, placeholders: ["phone"] },
      { key: "noOpenDatesMessage", label: "Message when no dates are open", multiline: true, placeholders: ["phone"] },
    ],
  },
  {
    title: "Progress steps and buttons",
    fields: [
      { key: "stepDates", label: "Step 1" },
      { key: "stepParty", label: "Step 2" },
      { key: "stepTravelers", label: "Step 3" },
      { key: "stepContact", label: "Step 4" },
      { key: "stepReview", label: "Step 5" },
      { key: "continueButton", label: "Continue button" },
      { key: "backButton", label: "Back button" },
    ],
  },
  {
    title: "Step 1: Dates",
    fields: [
      { key: "datesHeading", label: "Heading" },
      { key: "assuranceGuaranteed", label: "Guaranteed badge" },
      { key: "assuranceConditional", label: "Not yet guaranteed badge" },
    ],
  },
  {
    title: "Step 2: Party size",
    fields: [
      { key: "partyHeading", label: "Heading" },
      { key: "doubleRooms", label: "Double rooms" },
      { key: "doubleHint", label: "Double rooms hint", optional: true },
      { key: "singleRooms", label: "Single rooms" },
      { key: "singleHint", label: "Single rooms hint", optional: true },
      { key: "singleHintSupplement", label: "Single rooms hint with a supplement", optional: true, placeholders: ["supplement"] },
      { key: "tripleRooms", label: "Triple rooms" },
      { key: "tripleHint", label: "Triple rooms hint", optional: true },
      { key: "children", label: "Children" },
      { key: "travelerSingular", label: "\"Traveler\" (one)" },
      { key: "travelerPlural", label: "\"Travelers\" (several)" },
      { key: "estimatedTotal", label: "Estimated total, here and on the review step" },
      { key: "guaranteedPartyNote", label: "Note for a guaranteed departure", multiline: true },
      { key: "depositNote", label: "Deposit note", multiline: true, placeholders: ["deposit"] },
      { key: "noDepositNote", label: "Deposit note when the tour has no deposit", multiline: true },
      { key: "seatsWarning", label: "Too few seats warning", multiline: true, placeholders: ["seats", "spots"] },
    ],
  },
  {
    title: "Step 3: Travelers",
    fields: [
      { key: "travelersHeading", label: "Heading" },
      { key: "travelerCard", label: "Card title", placeholders: ["number"] },
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "dateOfBirth", label: "Date of birth" },
      { key: "passportNumber", label: "Passport number" },
      { key: "roomingWith", label: "Rooming with" },
      { key: "dietaryNeeds", label: "Dietary needs" },
      { key: "passportScan", label: "Passport scan" },
      { key: "passportScanOptional", label: "Passport scan, optional note", optional: true },
      { key: "uploadButton", label: "Upload button" },
      { key: "uploadingLabel", label: "While uploading" },
      { key: "passportUploaded", label: "After upload, if the file has no name" },
      { key: "removeButton", label: "Remove button" },
      { key: "secureUploadTitle", label: "Security note, highlighted start" },
      { key: "secureUploadBody", label: "Security note, the rest", multiline: true },
    ],
  },
  {
    title: "Step 4: Contact",
    fields: [
      { key: "contactHeading", label: "Heading" },
      { key: "contactName", label: "Name" },
      { key: "contactEmail", label: "Email" },
      { key: "contactPhone", label: "Phone" },
    ],
  },
  {
    title: "Step 5: Review",
    description: "The cancellation percentages and fee are filled in from the booking policy.",
    fields: [
      { key: "reviewHeading", label: "Heading" },
      { key: "reviewDeparture", label: "Departure row" },
      { key: "reviewTravelers", label: "Travelers row" },
      { key: "reviewBalance", label: "Balance row" },
      { key: "reviewBalanceValue", label: "Balance value", placeholders: ["amount", "days"] },
      { key: "guaranteedReviewNote", label: "Note for a guaranteed departure", multiline: true, placeholders: ["total"] },
      { key: "offlineTitle", label: "No online payment, title" },
      { key: "offlineBody", label: "No online payment, text", multiline: true },
      { key: "paymentChoiceHeading", label: "Payment choice heading" },
      { key: "callbackTitle", label: "Call me option" },
      { key: "callbackBody", label: "Call me text", multiline: true },
      { key: "payOnlineTitle", label: "Pay online option" },
      { key: "payOnlineBody", label: "Pay online text", multiline: true },
      { key: "paymentAmountLabel", label: "Payment slider label" },
      { key: "paymentMinLabel", label: "Slider minimum" },
      { key: "noDepositLabel", label: "Slider minimum when there is no deposit" },
      { key: "paymentMaxLabel", label: "Slider maximum" },
      { key: "cancellationHeading", label: "Cancellation heading" },
      { key: "cancellationTier", label: "Cancellation line", placeholders: ["days", "percent"] },
      { key: "cancellationFee", label: "Admin fee line", placeholders: ["fee"] },
      { key: "submitOnline", label: "Submit button, online payments on" },
      { key: "submitOffline", label: "Submit button, online payments off" },
      { key: "submitting", label: "While submitting" },
    ],
  },
  {
    title: "Payment and confirmation",
    fields: [
      { key: "paymentHeading", label: "Payment heading" },
      { key: "paymentBody", label: "Payment text", multiline: true, placeholders: ["amount"] },
      { key: "confirmationEyebrow", label: "Confirmation, small text" },
      { key: "confirmationHeading", label: "Confirmation heading" },
      { key: "confirmationCallback", label: "After choosing a call", multiline: true },
      { key: "confirmationPaid", label: "After paying", multiline: true },
      { key: "confirmationPaymentFailed", label: "When online payment could not start", multiline: true },
      { key: "questionsPrefix", label: "Before the phone number" },
    ],
  },
  {
    title: "Payment received page",
    description: "Shown after a payment link is paid.",
    fields: [
      { key: "successEyebrow", label: "Small text above the title" },
      { key: "successTitle", label: "Title" },
      { key: "successLede", label: "Intro", multiline: true },
      { key: "successBadge", label: "Badge" },
      { key: "successHeading", label: "Heading" },
      { key: "successPaid", label: "Paid row" },
      { key: "successTotal", label: "Total row" },
      { key: "successHomeLink", label: "Homepage link" },
    ],
  },
];

export const BLOG_COPY_DEFAULTS = {
  metaDescription: "מדריכי יעדים, טיפים ותכנון טיולים מצוות טיולי גשר.",
  eyebrow: "הבלוג",
  title: "סיפורים מהדרך",
  lede: "מדריכי יעדים, טיפים ותכנון טיולים — נכתבו על ידי הצוות שמוביל את הטיולים.",
  emptyMessage: "עדיין לא פורסמו פוסטים — פרסמו פוסט מ-/admin/blog כדי שיופיע כאן.",
  readMore: "להמשך קריאה",
  backLink: "לכל הפוסטים",
};

export type BlogCopy = typeof BLOG_COPY_DEFAULTS;

export const BLOG_COPY_SECTIONS: CopySection[] = [
  {
    title: "Blog page",
    fields: [
      { key: "eyebrow", label: "Small text above the title", optional: true },
      { key: "title", label: "Title" },
      { key: "lede", label: "Intro", multiline: true, optional: true },
      { key: "emptyMessage", label: "Message when there are no posts", multiline: true },
      { key: "readMore", label: "Link on each post card" },
      { key: "backLink", label: "Link back from a post" },
      { key: "metaDescription", label: "Search engine description", multiline: true },
    ],
  },
];

export const TESTIMONIALS_COPY_DEFAULTS = {
  heroImage: "",
  metaDescription: "מה אומרים המטיילים אחרי טיול עם טיולי גשר.",
  eyebrow: "מהמטיילים שלנו",
  title: "המלצות",
  lede: "משובים אמיתיים מטיולים אחרונים של טיולי גשר.",
  emptyMessage: "עדיין אין המלצות מאושרות — אשרו המלצה מ-/admin/reviews כדי שתופיע כאן.",
  letterSingular: "מכתב",
  letterPlural: "מכתבים",
};

export type TestimonialsCopy = typeof TESTIMONIALS_COPY_DEFAULTS;

export const TESTIMONIALS_COPY_SECTIONS: CopySection[] = [
  {
    title: "Testimonials page",
    description: "The letters themselves come from Reviews.",
    fields: [
      { key: "heroImage", label: "Background image", image: true, optional: true },
      { key: "eyebrow", label: "Small text above the title", optional: true },
      { key: "title", label: "Title" },
      { key: "lede", label: "Intro", multiline: true, optional: true },
      { key: "emptyMessage", label: "Message when there are no reviews", multiline: true },
      { key: "letterSingular", label: "Destination card count, one" },
      { key: "letterPlural", label: "Destination card count, several" },
      { key: "metaDescription", label: "Search engine description", multiline: true },
    ],
  },
];
