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
    title: "כרטיס ההרשמה",
    description: "חלונית המחיר והמועדים שליד הטיול. הסכומים מגיעים מהמחירים של כל טיול.",
    fields: [
      { key: "priceLabel", label: "מעל המחיר" },
      { key: "perPersonLabel", label: "אחרי המחיר" },
      { key: "priceNote", label: "הערה מתחת למחיר", multiline: true, placeholders: ["singlePrice"] },
      { key: "priceSupplement", label: "תוספת ליחיד, אחרי ההערה", optional: true, placeholders: ["supplement"] },
      { key: "flightsHighlight", label: "הדגשה כשהטיסות כלולות", optional: true },
      { key: "kosherHighlight", label: "הדגשת כשרות", optional: true },
      { key: "departuresHeading", label: "כותרת המועדים" },
      { key: "noDatesMessage", label: "הודעה כשאין מועדים", multiline: true },
      { key: "guideLabel", label: "לפני שם המדריך/ה" },
      { key: "bookButton", label: "כפתור הרשמה" },
      { key: "callPrefix", label: "לפני מספר הטלפון" },
      { key: "depositNote", label: "הערה על המקדמה", multiline: true, placeholders: ["deposit", "days"] },
      { key: "noDepositNote", label: "הערה על המקדמה כשאין מקדמה", multiline: true, placeholders: ["days"] },
    ],
  },
  {
    title: "זמינות המועדים",
    description: "מוצג גם בשלב הראשון של טופס ההרשמה.",
    fields: [
      { key: "statusAvailable", label: "פנוי" },
      { key: "statusLowSeats", label: "נותרו מקומות אחרונים", placeholders: ["seats"] },
      { key: "statusSoldOut", label: "מלא" },
      { key: "statusCancelled", label: "בוטל" },
    ],
  },
  {
    title: "לשוניות המקטעים",
    description: "שורת הקישורים שמתחת לתמונות.",
    fields: [
      { key: "navOverview", label: "סקירה" },
      { key: "navItinerary", label: "מסלול" },
      { key: "navGuides", label: "מדריכים" },
      { key: "navIncluded", label: "מה כלול" },
      { key: "navDownloads", label: "קבצים להורדה (PDF)" },
      { key: "navTestimonials", label: "המלצות" },
      { key: "navCancellation", label: "ביטול" },
      { key: "navDates", label: "מועדים (בנייד בלבד)" },
    ],
  },
  {
    title: "תמונות וסקירה",
    fields: [
      { key: "heroDays", label: "משך הטיול, על התמונה הראשית", placeholders: ["days"] },
      { key: "heroMorePhotos", label: "אריח ״עוד תמונות״", placeholders: ["count"] },
      { key: "overviewHeading", label: "כותרת הסקירה" },
      { key: "durationLabel", label: "תווית משך" },
      { key: "durationValue", label: "ערך המשך", placeholders: ["days", "nights"] },
      { key: "groupSizeLabel", label: "תווית גודל קבוצה" },
      { key: "groupSizeValue", label: "ערך גודל הקבוצה", placeholders: ["count"] },
      { key: "groupSizeFallback", label: "גודל קבוצה כשלא נקבע מינימום" },
      { key: "countriesLabel", label: "תווית מדינות" },
    ],
  },
  {
    title: "מסלול ומדריכים",
    fields: [
      { key: "itineraryHeading", label: "כותרת המסלול" },
      { key: "attractionsLabel", label: "תווית אטרקציות" },
      { key: "mealsLabel", label: "תווית ארוחות" },
      { key: "guidesHeading", label: "כותרת המדריכים" },
      { key: "guideLeadingLabel", label: "לפני התאריכים של מדריך/ה" },
    ],
  },
  {
    title: "כשרות",
    description: "כותרת הכשרות של טיול, אם נקבעה, מחליפה את כותרת ברירת המחדל.",
    fields: [
      { key: "kashrutDefaultTitle", label: "כותרת ברירת מחדל" },
      { key: "supervisionLabel", label: "תווית השגחה" },
      { key: "patYisraelLabel", label: "תווית פת ישראל" },
      { key: "chalavYisraelLabel", label: "תווית חלב ישראל" },
      { key: "kashrutGuaranteed", label: "סטטוס: מובטח" },
      { key: "kashrutNotGuaranteed", label: "סטטוס: לא מובטח" },
      { key: "kashrutNotOffered", label: "סטטוס: לא מוצע" },
    ],
  },
  {
    title: "כותרות נוספות",
    fields: [
      { key: "importantToKnowHeading", label: "חשוב לדעת" },
      { key: "includedHeading", label: "מה כלול" },
      { key: "notIncludedHeading", label: "לא כלול" },
      { key: "testimonialsHeading", label: "המלצות" },
      { key: "testimonialsLink", label: "קישור לכל ההמלצות" },
      { key: "cancellationHeading", label: "מדיניות ביטול" },
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
  passportFirstName: "שם פרטי באנגלית (כמו בדרכון)",
  passportLastName: "שם משפחה באנגלית (כמו בדרכון)",
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
    title: "כותרת הדף",
    description: "{phone} הופך לקישור לחיוג למספר שב״הגדרות״.",
    fields: [
      { key: "headerEyebrow", label: "טקסט קטן מעל שם הטיול" },
      { key: "headerLede", label: "פתיח", multiline: true },
      { key: "noDatesMessage", label: "הודעה כשלא פורסמו מועדים", multiline: true, placeholders: ["phone"] },
      { key: "noOpenDatesMessage", label: "הודעה כשאין מועדים פתוחים", multiline: true, placeholders: ["phone"] },
    ],
  },
  {
    title: "שלבי ההתקדמות והכפתורים",
    fields: [
      { key: "stepDates", label: "שלב 1" },
      { key: "stepParty", label: "שלב 2" },
      { key: "stepTravelers", label: "שלב 3" },
      { key: "stepContact", label: "שלב 4" },
      { key: "stepReview", label: "שלב 5" },
      { key: "continueButton", label: "כפתור המשך" },
      { key: "backButton", label: "כפתור חזרה" },
    ],
  },
  {
    title: "שלב 1: מועדים",
    fields: [
      { key: "datesHeading", label: "כותרת" },
      { key: "assuranceGuaranteed", label: "תג ״מובטח״" },
      { key: "assuranceConditional", label: "תג ״עדיין לא מובטח״" },
    ],
  },
  {
    title: "שלב 2: משתתפים",
    fields: [
      { key: "partyHeading", label: "כותרת" },
      { key: "doubleRooms", label: "חדרים זוגיים" },
      { key: "doubleHint", label: "הסבר לחדרים זוגיים", optional: true },
      { key: "singleRooms", label: "חדרים ליחיד" },
      { key: "singleHint", label: "הסבר לחדרים ליחיד", optional: true },
      { key: "singleHintSupplement", label: "הסבר לחדרים ליחיד עם תוספת", optional: true, placeholders: ["supplement"] },
      { key: "tripleRooms", label: "חדרים לשלושה" },
      { key: "tripleHint", label: "הסבר לחדרים לשלושה", optional: true },
      { key: "children", label: "ילדים" },
      { key: "travelerSingular", label: "״מטייל״ (יחיד)" },
      { key: "travelerPlural", label: "״מטיילים״ (רבים)" },
      { key: "estimatedTotal", label: "סה״כ משוער, כאן ובשלב הסיכום" },
      { key: "guaranteedPartyNote", label: "הערה ליציאה מובטחת", multiline: true },
      { key: "depositNote", label: "הערה על המקדמה", multiline: true, placeholders: ["deposit"] },
      { key: "noDepositNote", label: "הערה על המקדמה כשאין מקדמה", multiline: true },
      { key: "seatsWarning", label: "אזהרה על מחסור במקומות", multiline: true, placeholders: ["seats", "spots"] },
    ],
  },
  {
    title: "שלב 3: מטיילים",
    fields: [
      { key: "travelersHeading", label: "כותרת" },
      { key: "travelerCard", label: "כותרת הכרטיס", placeholders: ["number"] },
      { key: "firstName", label: "שם פרטי" },
      { key: "lastName", label: "שם משפחה" },
      { key: "passportFirstName", label: "שם פרטי באנגלית (דרכון)" },
      { key: "passportLastName", label: "שם משפחה באנגלית (דרכון)" },
      { key: "dateOfBirth", label: "תאריך לידה" },
      { key: "passportNumber", label: "מספר דרכון" },
      { key: "roomingWith", label: "חולק/ת חדר עם" },
      { key: "dietaryNeeds", label: "העדפות תזונה" },
      { key: "passportScan", label: "צילום דרכון" },
      { key: "passportScanOptional", label: "צילום דרכון, הערת ״לא חובה״", optional: true },
      { key: "uploadButton", label: "כפתור העלאה" },
      { key: "uploadingLabel", label: "בזמן ההעלאה" },
      { key: "passportUploaded", label: "אחרי ההעלאה, כשלקובץ אין שם" },
      { key: "removeButton", label: "כפתור הסרה" },
      { key: "secureUploadTitle", label: "הערת אבטחה, ההתחלה המודגשת" },
      { key: "secureUploadBody", label: "הערת אבטחה, ההמשך", multiline: true },
    ],
  },
  {
    title: "שלב 4: פרטי קשר",
    fields: [
      { key: "contactHeading", label: "כותרת" },
      { key: "contactName", label: "שם" },
      { key: "contactEmail", label: "אימייל" },
      { key: "contactPhone", label: "טלפון" },
    ],
  },
  {
    title: "שלב 5: סיכום",
    description: "אחוזי הביטול ודמי הטיפול מתמלאים לפי מדיניות ההרשמה.",
    fields: [
      { key: "reviewHeading", label: "כותרת" },
      { key: "reviewDeparture", label: "שורת המועד" },
      { key: "reviewTravelers", label: "שורת המטיילים" },
      { key: "reviewBalance", label: "שורת היתרה" },
      { key: "reviewBalanceValue", label: "ערך היתרה", placeholders: ["amount", "days"] },
      { key: "guaranteedReviewNote", label: "הערה ליציאה מובטחת", multiline: true, placeholders: ["total"] },
      { key: "offlineTitle", label: "בלי תשלום באתר, כותרת" },
      { key: "offlineBody", label: "בלי תשלום באתר, טקסט", multiline: true },
      { key: "paymentChoiceHeading", label: "כותרת בחירת התשלום" },
      { key: "callbackTitle", label: "אפשרות ״חזרו אליי״" },
      { key: "callbackBody", label: "טקסט ״חזרו אליי״", multiline: true },
      { key: "payOnlineTitle", label: "אפשרות תשלום באתר" },
      { key: "payOnlineBody", label: "טקסט תשלום באתר", multiline: true },
      { key: "paymentAmountLabel", label: "תווית סרגל התשלום" },
      { key: "paymentMinLabel", label: "מינימום בסרגל" },
      { key: "noDepositLabel", label: "מינימום בסרגל כשאין מקדמה" },
      { key: "paymentMaxLabel", label: "מקסימום בסרגל" },
      { key: "cancellationHeading", label: "כותרת הביטול" },
      { key: "cancellationTier", label: "שורת ביטול", placeholders: ["days", "percent"] },
      { key: "cancellationFee", label: "שורת דמי טיפול", placeholders: ["fee"] },
      { key: "submitOnline", label: "כפתור שליחה, כשהתשלום באתר פעיל" },
      { key: "submitOffline", label: "כפתור שליחה, כשהתשלום באתר כבוי" },
      { key: "submitting", label: "בזמן השליחה" },
    ],
  },
  {
    title: "תשלום ואישור",
    fields: [
      { key: "paymentHeading", label: "כותרת התשלום" },
      { key: "paymentBody", label: "טקסט התשלום", multiline: true, placeholders: ["amount"] },
      { key: "confirmationEyebrow", label: "אישור, טקסט קטן" },
      { key: "confirmationHeading", label: "כותרת האישור" },
      { key: "confirmationCallback", label: "אחרי בחירה בשיחה", multiline: true },
      { key: "confirmationPaid", label: "אחרי תשלום", multiline: true },
      { key: "confirmationPaymentFailed", label: "כשהתשלום באתר לא הצליח להתחיל", multiline: true },
      { key: "questionsPrefix", label: "לפני מספר הטלפון" },
    ],
  },
  {
    title: "דף ״התשלום התקבל״",
    description: "מוצג אחרי תשלום בקישור תשלום.",
    fields: [
      { key: "successEyebrow", label: "טקסט קטן מעל הכותרת" },
      { key: "successTitle", label: "כותרת" },
      { key: "successLede", label: "פתיח", multiline: true },
      { key: "successBadge", label: "תג" },
      { key: "successHeading", label: "כותרת" },
      { key: "successPaid", label: "שורת ״שולם״" },
      { key: "successTotal", label: "שורת סה״כ" },
      { key: "successHomeLink", label: "קישור לדף הבית" },
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
    title: "דף הבלוג",
    fields: [
      { key: "eyebrow", label: "טקסט קטן מעל הכותרת", optional: true },
      { key: "title", label: "כותרת" },
      { key: "lede", label: "פתיח", multiline: true, optional: true },
      { key: "emptyMessage", label: "הודעה כשאין פוסטים", multiline: true },
      { key: "readMore", label: "קישור בכל כרטיס פוסט" },
      { key: "backLink", label: "קישור חזרה מפוסט" },
      { key: "metaDescription", label: "תיאור למנועי חיפוש", multiline: true },
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
    title: "דף ההמלצות",
    description: "ההמלצות עצמן מגיעות ממסך ״המלצות״.",
    fields: [
      { key: "heroImage", label: "תמונת רקע", image: true, optional: true },
      { key: "eyebrow", label: "טקסט קטן מעל הכותרת", optional: true },
      { key: "title", label: "כותרת" },
      { key: "lede", label: "פתיח", multiline: true, optional: true },
      { key: "emptyMessage", label: "הודעה כשאין המלצות", multiline: true },
      { key: "letterSingular", label: "מונה בכרטיס יעד, יחיד" },
      { key: "letterPlural", label: "מונה בכרטיס יעד, רבים" },
      { key: "metaDescription", label: "תיאור למנועי חיפוש", multiline: true },
    ],
  },
];
