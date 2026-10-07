import Image, { type ImageProps } from 'next/image';

/** Bundled stay JPEGs are served directly: the deployed optimizer rejects them
 * even though the public originals return valid JPEGs. Keep remote optimization
 * and all caller layout/loading/accessibility props unchanged.
 */
export function StayImage(props: ImageProps) {
  const bundledPhoto = typeof props.src === 'string'
    && /^\/images\/stays\/[a-zA-Z0-9_-]+\.jpg$/.test(props.src);
  return <Image {...props} alt={props.alt} unoptimized={bundledPhoto || props.unoptimized} />;
}
