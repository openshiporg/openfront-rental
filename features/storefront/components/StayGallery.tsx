'use client';
import { StayImage as Image } from './StayImage';
import { useRef, useState } from 'react';
export function StayGallery({ title, photos }: { title: string; photos: { id?: string; url?: string; altText?: string; caption?: string }[] }) {
  const images = photos.filter(photo => photo.url);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [index, setIndex] = useState(0);
  function open(next: number, button: HTMLButtonElement) { setIndex(next); opener.current = button; dialog.current?.showModal(); }
  function close() { dialog.current?.close(); opener.current?.focus(); }
  function trapTab(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (!images.length) return <div className="stay-shell stay-gallery-empty">Photographs have not been published for this home. Ask the host for details before reserving.</div>;
  return <section className="stay-shell stay-gallery-section" aria-label={`${title} photographs`}>
    <div className={`stay-photo-grid ${images.length === 1 ? 'stay-photo-single' : ''}`}>{images.slice(0, 3).map((photo, position) => <button type="button" key={photo.id || photo.url} className={`stay-gallery-photo stay-gallery-photo-${position}`} onClick={event => open(position, event.currentTarget)} aria-label={`Open photo ${position + 1} of ${images.length}: ${photo.altText || title}`}><Image src={photo.url!} alt={photo.altText || `${title}, view ${position + 1}`} fill priority={position === 0} sizes="(max-width: 700px) 100vw, 60vw" />{photo.caption ? <span className="stay-photo-caption">{photo.caption}</span> : null}</button>)}</div>
    <button className="stay-gallery-all" type="button" onClick={event => open(0, event.currentTarget)}>View all {images.length} photos <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} className="stay-gallery-dialog" aria-labelledby="gallery-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { trapTab(event); if (event.key === 'ArrowRight') setIndex((index + 1) % images.length); if (event.key === 'ArrowLeft') setIndex((index + images.length - 1) % images.length); }}>
      <div className="stay-gallery-dialog-head"><h2 id="gallery-title">{title} · photographs</h2><button autoFocus type="button" onClick={close}>Close ×</button></div>
      <figure><div className="stay-lightbox-image"><Image src={images[index].url!} alt={images[index].altText || `${title}, view ${index + 1}`} fill sizes="90vw" /></div><figcaption aria-live="polite">{index + 1} / {images.length}{images[index].caption ? ` — ${images[index].caption}` : ''}</figcaption></figure>
      <div className="stay-gallery-controls"><button type="button" disabled={images.length < 2} onClick={() => setIndex((index + images.length - 1) % images.length)}>← Previous photo</button><button type="button" disabled={images.length < 2} onClick={() => setIndex((index + 1) % images.length)}>Next photo →</button></div>
    </dialog>
  </section>;
}
