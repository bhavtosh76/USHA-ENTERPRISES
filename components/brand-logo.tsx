/**
 * Brand logo lockup used in the public site, login screen and ERP sidebar.
 * The uploaded artwork already contains the USHA ENTERPRISES wordmark, so it
 * renders as a single rounded tile that stays crisp on light and dark surfaces.
 */
export function BrandLogo({
  size = 40,
  className = "",
  rounded = "rounded-xl",
  priority = false,
}: {
  size?: number;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  return (
    <img
      src="/brand/usha-logo-512.jpg"
      alt="USHA ENTERPRISES — Solar"
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`shrink-0 bg-white object-cover ring-1 ring-black/5 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
