import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_HOME_HERO_IMAGE } from "@/lib/homeHero";
import type {
  SiteContentAbout,
  SiteContentContact,
  SiteContentFaq,
  SiteContentHome,
  SiteContentLegal,
  SiteContentPageKey,
  SiteContentSimplePage,
} from "@/lib/types";

import {
  BLOG_COPY_DEFAULTS,
  BOOKING_COPY_DEFAULTS,
  TESTIMONIALS_COPY_DEFAULTS,
  TOUR_PAGE_COPY_DEFAULTS,
  type BlogCopy,
  type BookingCopy,
  type TestimonialsCopy,
  type TourPageCopy,
} from "@/lib/siteCopy";

const COLLECTION = "siteContent";

/**
 * Every default below is the copy that was hardcoded directly in the page
 * components before this admin editor existed — seeding with it means the
 * site renders identically on day one, and the admin form opens pre-filled
 * with real copy instead of blank fields.
 */
export const SITE_CONTENT_DEFAULTS = {
  home: {
    heroImage: DEFAULT_HOME_HERO_IMAGE,
    heroEyebrow: "טיולי גשר מבית שי בר-אילן",
    heroTitleLine1: "טיולים מאורגנים למקומות",
    heroTitleHighlight: "שתמיד חלמתם לראות",
    heroSubtitle: "טיולים מודרכים בקבוצות ברחבי העולם, עם ליווי צמוד מהנחיתה ועד החזרה.",
    heroPrimaryCta: "לכל הטיולים",
    trustSignals: [
      {
        title: "כשרות שאפשר לסמוך עליה",
        body: "בכל טיול נמצא משגיח מטעם החברה בנוסף להשגחה המקומית — לא רק הבטחה, אלא אדם שנמצא שם.",
      },
      {
        title: "ליווי בכל שלב",
        body: "מדריך שומר שבת דובר עברית מלווה את הקבוצה מהנחיתה ועד ההמראה חזרה.",
      },
      {
        title: "זמינות מסביב לשעון",
        body: "שאלות לפני היציאה או במהלך הטיול — אפשר להתקשר בכל שעה.",
      },
    ],
    ctaHeading: "תכננו את",
    ctaHeadingHighlight: "הטיול שלכם",
    ctaBody:
      "מבחירת היעד ועד פרטי הכשרות, אנחנו בונים כל שלב בטיול סביב מה שחשוב לכם ולמשפחה ולחוויה שאתם רוצים.",
    ctaPrimaryButton: "לתכנון טיול בהתאמה אישית",
    ctaSecondaryButton: "צרו קשר עם הצוות",
  } satisfies SiteContentHome,

  about: {
    // Placeholder until Gesher's own About text is imported from geshertours.co.il.
    eyebrow: "אודות טיולי גשר",
    title: "לטייל בעולם, בדרך שלנו",
    lede: "מחפשים טיול נטול דאגות ליעדים מרתקים, מסלול עשיר ומגוון, וקבוצה שנעים לטייל איתה? טיולי גשר בשבילכם.",
    sections: [
      {
        sectionId: "escort",
        heading: "מלווה צמוד לאורך כל היום",
        body: "דמיינו שאתם יוצאים לארץ זרה עם מלווה שדואג לכל צרכיכם ונמצא עם הקבוצה לאורך כל הטיול. המלווים שלנו מנוסים ובעלי ידע רחב על היעד שבו הם מדריכים. הם שם כדי לפתור בעיות, לענות על שאלות ולתת כל עצה שתצטרכו במהלך הטיול.",
      },
      {
        sectionId: "kosher-days",
        heading: "אוכל כשר מחכה, כל יום מתוכנן",
        body: "אתם קמים בבוקר ולא צריכים לדאוג איפה למצוא אוכל כשר, כי הוא כבר מחכה לכם בחדר האוכל. אין צורך לתכנן את היום — מומחים מקומיים בחרו את האתרים המעניינים והצבעוניים ביותר ואת הסדר והמסלולים הטובים ביותר, כך שתבלו יותר זמן באתרים ופחות בדרכים. תקבלו הסברים על ההקשר של מה שאתם רואים: ההיסטוריה, התרבות והמורשת היהודית של כל ארץ.\n\nבסוף יום מלא בפעילות מחכה לכם ארוחת ערב כשרה וטרייה.",
      },
      {
        sectionId: "group",
        heading: "קבוצה שהופכת למשפחה",
        body: "בטיולים שלנו תחוו את כל זה עם קבוצה של אנשים נעימים שהופכים למשפחה — עוזרים זה לזה, מצלמים זה את זה, שרים וצוחקים יחד.",
      },
      {
        sectionId: "experience",
        heading: "עשרות שנות ניסיון",
        body: "טיולי גשר הם חלק מקבוצת שי בר-אילן, עם עשרות שנות ניסיון ומטיילים שחוזרים אלינו שוב ושוב. אנחנו נהנים לשרת את המטיילים שלנו ולהעניק להם טיולים בלתי נשכחים.",
      },
    ],
  } satisfies SiteContentAbout,

  "custom-tours": {
    eyebrow: "טיולים לקבוצות פרטיות",
    title: "טיול שנבנה כולו סביב הקבוצה שלכם",
    lede: "רוצים לטייל רק עם המשפחה, חברים קרובים או הקהילה? נתכנן מסלול במיוחד בשבילכם — כולל טיולי שורשים לארץ המוצא של המשפחה.",
  } satisfies SiteContentSimplePage,

  "special-offers": {
    eyebrow: "לזמן מוגבל",
    title: "מבצעים",
    lede: "מבצעים עונתיים והנחות להרשמה מוקדמת.",
  } satisfies SiteContentSimplePage,

  testimonials: TESTIMONIALS_COPY_DEFAULTS,

  "tour-page": TOUR_PAGE_COPY_DEFAULTS,

  booking: BOOKING_COPY_DEFAULTS,

  blog: BLOG_COPY_DEFAULTS,

  faq: {
    title: "שאלות נפוצות",
    items: [
      {
        itemId: "kashrut",
        question: "איך נשמרת הכשרות בטיול?",
        answer:
          "בכל יציאה נמצא משגיח מטעם החברה בנוסף להשגחת הרבנות המקומית או חב\"ד. הארוחות מוכנות בכלים של הקבוצה במידת הצורך, והפרטים המלאים מופיעים בעמוד של כל טיול.",
      },
      {
        itemId: "included",
        question: "מה כלול במחיר?",
        answer:
          "בתי מלון, ארוחות כשרות, הסעות, דמי כניסה ומדריך דובר עברית. טיסות בינלאומיות אינן כלולות אלא אם צוין אחרת — ראו את פרק המחירים והמועדים בעמוד של כל טיול.",
      },
      {
        itemId: "deposit",
        question: "מה גובה המקדמה ומתי משלמים את היתרה?",
        answer:
          "גובה המקדמה ומועד תשלום היתרה משתנים מטיול לטיול ומופיעים בבירור בעמוד הטיול לפני ההרשמה.",
      },
      {
        itemId: "min-group",
        question: "מה קורה אם הטיול לא מגיע למספר המשתתפים המינימלי?",
        answer:
          "לכל טיול יש מספר מינימלי של משתתפים. אם המינימום לא מושג, תקבלו הודעה מראש והחזר כספי מלא.",
      },
      {
        itemId: "older-travelers",
        question: "האם הטיול מתאים למטיילים מבוגרים?",
        answer:
          "רבים מהמטיילים שלנו בני 50 ומעלה. התקשרו אלינו ונשמח לשוחח על הקצב והדרישות הפיזיות של כל טיול.",
      },
    ],
  } satisfies SiteContentFaq,

  contact: {
    title: "צרו קשר",
    lede: "התקשרו בכל שעה, או שלחו לנו את תוכניות הנסיעה שלכם ונחזור אליכם.",
  } satisfies SiteContentContact,

  // The Keshertours legal texts were a US company's contracts and do not
  // apply to Gesher. Replace these with Gesher's own lawyer-approved text
  // (Admin → Site content) before launch.
  "legal-privacy": {
    title: "מדיניות פרטיות",
    body: "מדיניות הפרטיות של טיולי גשר תפורסם כאן בקרוב.\n\nלשאלות בנושא פרטיות ומידע אישי ניתן לפנות אלינו דרך עמוד צור קשר.",
  } satisfies SiteContentLegal,

  "legal-terms": {
    title: "תקנון ותנאי הזמנה",
    body: "תקנון האתר ותנאי ההזמנה של טיולי גשר יפורסמו כאן בקרוב.\n\nלשאלות בנושא הזמנות, תשלומים וביטולים ניתן לפנות אלינו דרך עמוד צור קשר.",
  } satisfies SiteContentLegal,
} as const;

export type SiteContentMap = {
  home: SiteContentHome;
  about: SiteContentAbout;
  "custom-tours": SiteContentSimplePage;
  "special-offers": SiteContentSimplePage;
  testimonials: TestimonialsCopy;
  "tour-page": TourPageCopy;
  booking: BookingCopy;
  blog: BlogCopy;
  faq: SiteContentFaq;
  contact: SiteContentContact;
  "legal-privacy": SiteContentLegal;
  "legal-terms": SiteContentLegal;
};

/** Shared by both the public pages and the admin editor forms — merges the saved doc (if any) over the seed default, so a partially-saved doc never blanks out fields it didn't touch. */
export async function getSiteContent<K extends SiteContentPageKey>(
  pageKey: K
): Promise<SiteContentMap[K]> {
  const fallback = SITE_CONTENT_DEFAULTS[pageKey] as SiteContentMap[K];
  const doc = await adminDb().collection(COLLECTION).doc(pageKey).get();
  if (!doc.exists) return fallback;
  return { ...fallback, ...(doc.data() as Partial<SiteContentMap[K]>) };
}

export async function saveSiteContent<K extends SiteContentPageKey>(
  pageKey: K,
  content: SiteContentMap[K]
): Promise<void> {
  await adminDb().collection(COLLECTION).doc(pageKey).set(content);
}
