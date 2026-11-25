import { countryFromHebrew, hebrewCountryNames } from "../../lib/countryNames";

/**
 * Hebrew place matching shared by the geshertours.co.il imports (tours,
 * testimonials). Place names and spellings the old site uses that aren't the
 * country's Hebrew name in lib/countryNames.ts, mapped to the stored English
 * country.
 */
export const PLACE_ALIASES: Record<string, string> = {
  "איחוד האמירויות": "United Arab Emirates",
  "דובאי": "United Arab Emirates",
  "אבו דאבי": "United Arab Emirates",
  'ארה"ב': "United States",
  "ארה״ב": "United States",
  "נורבגיה": "Norway",
  "שבדיה": "Sweden",
  "סקנדינביה": "Norway",
  "צ׳כיה": "Czechia",
  "פראג": "Czechia",
  "וינה": "Austria",
  "בודפשט": "Hungary",
  "ברטיסלבה": "Slovakia",
  "הטטרה": "Slovakia",
  "בוקרשט": "Romania",
  "הקרפטים": "Romania",
  "סלוניקי": "Greece",
  "אתונה": "Greece",
  "סיציליה": "Italy",
  "טוסקנה": "Italy",
  "נאפולי": "Italy",
  "אמלפי": "Italy",
  "אלזס": "France",
  "אלזאס": "France",
  "היער השחור": "Germany",
  "יער השחור": "Germany",
  "חבל הריין": "Germany",
  "טביליסי": "Georgia",
  "בטומי": "Georgia",
  "גיאורגיה": "Georgia",
  "אזרבייג׳אן": "Azerbaijan",
  "אזבייג׳ן": "Azerbaijan",
  "שוויץ": "Switzerland",
  "החוף הבלטי": "Estonia",
};

/** Countries named in free text, in order of first appearance. */
export function countriesIn(text: string): string[] {
  const normalized = text.replace(/'/g, "׳");
  // A whole word, allowing the one-letter prefixes Hebrew attaches (ל, ב, ו, מ, ה, ש):
  // "לפורטוגל" matches Portugal, but "בשילוב" doesn't match Libya (לוב).
  const find = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^|[^א-ת׳"״])(?:[ולבמהש]{0,2})${escaped}(?![א-ת])`).exec(normalized);
    return match ? match.index : -1;
  };
  const hits: { index: number; country: string }[] = [];
  for (const hebrew of hebrewCountryNames()) {
    const index = find(hebrew);
    const country = countryFromHebrew(hebrew);
    if (index >= 0 && country) hits.push({ index, country });
  }
  for (const [place, country] of Object.entries(PLACE_ALIASES)) {
    const index = find(place.replace(/'/g, "׳"));
    if (index >= 0) hits.push({ index, country });
  }
  hits.sort((a, b) => a.index - b.index);
  // Every trip leaves from Israel, so "ישראל" in a subtitle is never the destination.
  return Array.from(new Set(hits.map((h) => h.country))).filter((country) => country !== "Israel");
}

/** The original upload, not a WordPress thumbnail ("photo-200x300.jpg" → "photo.jpg"). */
export function fullSizeImage(src: string): string {
  return src.replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp|gif)$)/i, "");
}
