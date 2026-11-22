# Gesher Tours: migration handoff

Status as of 2026-11-22. Read this first to continue the work, for
example by pointing Claude Code at this file ("read
docs/gesher-migration-handoff.md and continue").

## What this repo is

- Gesher Tours (טיולי גשר) is a Shai Bar Ilan company, separate from
  Keshertours. Its site is a Hebrew, right-to-left version of the
  Keshertours site, with its own tours, admins, blog and data.
- The repo was copied from `itvikl/tors_keser` with its full history.
  Keshertours is the `upstream` remote, so fixes can be copied over with
  `git cherry-pick`.
- Branches: `dev` (work) and `main` (production). Everything below is on
  `dev`.

## Done

1. **Logo:** `public/gesher-logo.png` (original) and
   `public/gesher-logo-on-dark.png` (white lettering, no white disk), used
   for the dark theme. `components/marketing/BrandLogo.tsx` switches them
   with the theme; admin always uses the original (`onLightBackground`).
2. **Firebase project `gesher-tours`:** `.firebaserc`, `apphosting.yaml`,
   the deploy script in `package.json` and
   `.github/workflows/deploy-apphosting.yml` point at it.
   - Site URL: `https://geshertours.co.il`.
   - Removed Keshertours' Google Analytics ID, Search Console codes and
     staff email addresses.
   - Sender email: `bookings@geshertours.co.il` (verify in Resend).
   - The stock photos are served from `public/stock/`, no longer from
     Keshertours' storage.
3. **Hebrew and right-to-left (public site):**
   - `<html lang="he" dir="rtl">` and the Heebo font.
   - Left/right Tailwind classes are now start/end classes.
   - Dates use he-IL formatting. Prices are still charged in USD.
   - All public text, forms, error messages, page titles and the customer
     emails are Hebrew.
   - Country names display in Hebrew (`lib/countryNames.ts`); tours stay
     stored with English country names.
   - Editable copy defaults are Hebrew: `lib/siteCopy.ts`,
     `lib/data/siteContent.ts`.
4. **Verified:** with the local Firestore emulator and seed data, every
   page returns 200, `next build` passes and the screenshots look right.
   The 8 lint errors were already there.

## Placeholders still to replace

- **About page:** generic text. Replace it with the real text from
  geshertours.co.il.
- **Privacy and terms pages:** "coming soon" placeholders. Keshertours'
  texts were US contracts and were removed. The old site has
  "תנאים כלליים ואחריות" (Gesher's own terms).
- **Phone:** the fallback is still Keshertours' `1-800-847-0700`
  (`lib/sitePhone.ts`). Set the real number in Admin → Settings.
- **Footer destinations:** Italy, Costa Rica and Morocco, in
  `components/marketing/Footer.tsx`. Adjust them to Gesher's
  destinations.

## Not done yet

- **Admin panel:** still English. The layout is already right-to-left.
  Labels, buttons, `lib/validation/*` messages and admin action errors
  still need translating.
- **Header logo size:** the square logo is small at header height. Use a
  wide version if one exists, or make the header taller.

## Next step: import content from geshertours.co.il

Findings from the old site, which runs WordPress 7.1.5:

- **56 tours.** Only 10 have upcoming dates. The tours aren't available
  through the REST API (a custom post type), so they have to be read
  from the HTML pages. The list is in `/tours-sitemap.xml`.
- **84 testimonials** (`/recommendations-sitemap.xml`) and **72 blog
  posts** (REST: `/wp-json/wp/v2/posts`).
- **15 pages** (REST: `/wp-json/wp/v2/pages`): About, Our guides,
  Trips to Poland, the accessibility statement, General terms, and
  others.
- **Same theme as old Keshertours** (`sbi`). These selectors exist on
  the Gesher tour pages:
  - `#collapsetourmaincontent`, `#tourroute .panel.panel-default` (one
    per day), `#includes`, `#excludes`, `#gotoknow`
  - `#datesandpricing .mixitup .mix.tr`, with `data-price`,
    `.date_start span` (format `DD.MM.YY`), `.date_end`, `.date_days`,
    `.date_price`, `.date_price_another` (single supplement)
  - `h1`, `.single-sub-title`
- **Missing on Gesher pages:** `#sidebar_gallery`, `.heading_content`
  and `.single-sub-title-days`. Collect images from the page's
  `wp-content/uploads` images instead.
- **Currency:** 21 departures are in USD and 2 in EUR (the Italy
  carnival tour). The plan is to convert that one tour to USD.

Plan, based on `scripts/migrate-legacy-tours.ts` and the
`scripts/migrate/*` scripts:

1. Build a Gesher tour import that defaults to a dry run and writes a
   JSON preview.
2. Past tours become `archived`. The 10 tours with upcoming dates get
   their departures, and a person decides which to publish.
3. Copy images into Gesher's Firebase Storage.
4. Import the testimonials and blog posts.
5. Replace the About and terms text.
6. Generate redirects from the old URLs.
7. Running with `--commit` needs the `gesher-tours` service-account key
   in `.env.local`. Run that on your own machine, and never commit the
   key.

## Open questions for the owner

- **Euro tour:** convert it to USD, or add per-tour currency support?
- **Traveler names:** require English names, as on the passport? The
  form currently accepts Hebrew names.
- Gesher's phone, email, address and WhatsApp, and which inboxes get
  booking alerts.
- Is there a wide (horizontal) version of the logo?

## Owner setup checklist (Firebase and services)

1. Turn on the Blaze plan, Firestore and Storage (region near Israel),
   and Authentication with Email/Password.
2. Deploy the rules:
   `npx firebase-tools deploy --only firestore,storage --project gesher-tours`
3. Create an App Hosting backend named `mainprod` connected to
   `zvimoe/gesher_tours`, with automatic rollouts off.
4. Store these secrets with
   `npx firebase-tools apphosting:secrets:set <NAME> --project gesher-tours`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
5. Put the real hosted.app address in `scripts/launch/set-site-url.mjs`
   (it currently says `REGION`).
6. Later:
   - Stripe keys.
   - `RESEND_API_KEY` and domain verification.
   - The `FIREBASE_SERVICE_ACCOUNT` GitHub secret.
   - Connect the geshertours.co.il domain at launch.

## Running locally without real Firebase

```bash
npx firebase-tools emulators:start --only firestore --project demo-gesher
# in another shell:
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_ADMIN_PROJECT_ID=demo-gesher
export FIREBASE_ADMIN_CLIENT_EMAIL=fake@demo-gesher.iam.gserviceaccount.com
export FIREBASE_ADMIN_PRIVATE_KEY="$(openssl genrsa 2048 2>/dev/null)"   # any RSA key; the emulator ignores it
export NEXT_PUBLIC_SITE_URL=http://localhost:3000
npx tsx scripts/seed-firestore.ts   # sample tours
npm run dev
```
