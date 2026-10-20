import Image, { type ImageProps } from 'next/image';

/** Bundled stay JPEGs are served directly: the deployed optimizer rejects them
 * even though the public originals return valid JPEGs. Photos a host adds by URL
 * can live on any host, which the optimizer's allow-list would refuse, so absolute
 * URLs are served directly too. Keep all caller layout/loading/accessibility props
 * unchanged.
 */
export function StayImage(props: ImageProps) {
  const bundledPhoto = typeof props.src === 'string'
    && /^\/images\/stays\/[a-zA-Z0-9_-]+\.jpg$/.test(props.src);
  const remotePhoto = typeof props.src === 'string' && /^https?:\/\//i.test(props.src);
  return <Image {...props} alt={props.alt} unoptimized={bundledPhoto || remotePhoto || props.unoptimized} />;
}
