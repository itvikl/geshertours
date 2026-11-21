import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { Heebo } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/siteUrl";

// Heebo covers Hebrew and Latin in one family, so mixed Hebrew/English text
// (tour names, prices) stays in a single typeface.
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "טיולי גשר — טיולים מאורגנים בעולם",
    template: "%s | טיולי גשר",
  },
  description:
    "טיולים מאורגנים ליעדים ברחבי העולם — עם ליווי צמוד, כשרות מלאה ומדריכים דוברי עברית.",
  openGraph: {
    type: "website",
    siteName: "טיולי גשר",
    locale: "he_IL",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Every tour photo comes from Firebase Storage: open that connection while the HTML is still arriving, so the first photo does not wait for a fresh handshake.
  preconnect("https://firebasestorage.googleapis.com");

  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[var(--color-glacier)] font-body text-[var(--color-mist)]">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
