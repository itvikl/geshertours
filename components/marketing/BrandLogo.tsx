import Link from "next/link";

const ALT = "טיולי גשר – Gesher Tours";

/**
 * The wordmark files are the Gesher logo cut down to the globe and lettering:
 * the original's white disk and padding are removed so the letters fill the
 * given height (public/gesher-logo.png keeps the full original). On the dark
 * marketing theme the site shows the white-lettering variant and switches to
 * the navy one in light mode (see `.brand-logo-*` in globals.css). Admin
 * screens are always white, so they pass `onLightBackground` and get navy only.
 */
export default function BrandLogo({
  className = "h-11 w-auto object-contain sm:h-12",
  href = "/",
  onLightBackground = false,
}: {
  className?: string;
  href?: string | null;
  onLightBackground?: boolean;
}) {
  /* eslint-disable @next/next/no-img-element */
  const image = onLightBackground ? (
    <img src="/gesher-logo-wordmark.png" alt={ALT} className={className} />
  ) : (
    <>
      <img src="/gesher-logo-wordmark-on-dark.png" alt={ALT} className={`brand-logo-dark ${className}`} />
      <img src="/gesher-logo-wordmark.png" alt={ALT} className={`brand-logo-light ${className}`} />
    </>
  );
  /* eslint-enable @next/next/no-img-element */

  if (!href) return <span className="inline-block shrink-0">{image}</span>;

  return (
    <Link href={href} className="inline-block shrink-0 transition-opacity hover:opacity-90">
      {image}
    </Link>
  );
}
