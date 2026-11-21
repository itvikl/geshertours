import Link from "next/link";

const ALT = "טיולי גשר – Gesher Tours";

/**
 * The Gesher logo has navy lettering on a white disk. On the dark marketing
 * theme that reads as a white badge, so the marketing site shows a variant
 * with white lettering and no disk, and switches back to the original in
 * light mode (see `.brand-logo-*` in globals.css). Admin screens are always
 * white, so they pass `onLightBackground` and get the original only.
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
    <img src="/gesher-logo.png" alt={ALT} className={className} />
  ) : (
    <>
      <img src="/gesher-logo-on-dark.png" alt={ALT} className={`brand-logo-dark ${className}`} />
      <img src="/gesher-logo.png" alt={ALT} className={`brand-logo-light ${className}`} />
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
