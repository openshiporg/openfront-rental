/**
 * sRGB hex for an OKLCH colour, for embedded widgets (Stripe Elements) that can't take
 * oklch(). Uses the standard OKLab → linear sRGB matrices and clamps out-of-gamut values.
 */
export function oklchToHex(lightness: number, chroma: number, hueDegrees: number) {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${channels.map((linear) => {
    const value = Math.min(1, Math.max(0, linear));
    const encoded = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255).toString(16).padStart(2, '0');
  }).join('')}`;
}

/** The storefront's --stay-accent / --stay-ink for a brand hue (see storefront.css). */
export function storefrontAccentHex(hue: number) {
  return oklchToHex(0.42, 0.085, hue);
}

export function storefrontInkHex(hue: number) {
  return oklchToHex(0.23, 0.03, hue);
}
