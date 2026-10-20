'use client';

import { ChevronLeft, ChevronRight, Grid2x2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { StayImage as Image } from './StayImage';

type Photo = { id?: string; url?: string; altText?: string; caption?: string };

export function StayGallery({ title, photos }: { title: string; photos: Photo[] }) {
  const images = photos.filter(photo => photo.url);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [railIndex, setRailIndex] = useState(0);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const onScroll = () => setRailIndex(Math.round(node.scrollLeft / Math.max(node.clientWidth, 1)));
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  function open(next: number, trigger: HTMLElement) {
    setIndex(next);
    opener.current = trigger;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
  }
  function close() {
    dialog.current?.close();
  }
  function step(delta: number) {
    setIndex(current => (current + delta + images.length) % images.length);
  }
  function trapTab(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  if (!images.length) {
    return <div className="stay-gallery-empty">Photographs have not been published for this home. Ask the host for details before reserving.</div>;
  }

  const mosaic = images.slice(0, 5);
  const current = images[index];
  return (
    <section className="stay-gallery" aria-label={`${title} photographs`}>
      <div className={`stay-mosaic stay-mosaic-${mosaic.length}`}>
        {mosaic.map((photo, position) => (
          <button type="button" key={photo.id || photo.url} className="stay-mosaic-tile" onClick={event => open(position, event.currentTarget)} aria-label={`Open photo ${position + 1} of ${images.length}: ${photo.altText || title}`}>
            <Image src={photo.url!} alt={photo.altText || `${title}, view ${position + 1}`} fill priority={position === 0} sizes={position === 0 ? '(max-width: 760px) 100vw, 60vw' : '(max-width: 760px) 100vw, 30vw'} />
            {photo.caption && position === 0 ? <span className="stay-mosaic-caption">{photo.caption}</span> : null}
          </button>
        ))}
        <button type="button" className="stay-mosaic-all" onClick={event => open(0, event.currentTarget)}>
          <Grid2x2 size={15} aria-hidden="true" />{images.length === 1 ? 'View photo' : `All ${images.length} photos`}
        </button>
      </div>

      <div className="stay-rail" ref={rail} aria-label={`${title} photographs, swipe for more`} tabIndex={0}>
        {images.map((photo, position) => (
          <button type="button" key={photo.id || photo.url} className="stay-rail-slide" onClick={event => open(position, event.currentTarget)} aria-label={`Open photo ${position + 1} of ${images.length}`}>
            <Image src={photo.url!} alt={photo.altText || `${title}, view ${position + 1}`} fill priority={position === 0} sizes="100vw" />
          </button>
        ))}
      </div>
      {images.length > 1 ? <span className="stay-rail-count" aria-hidden="true">{railIndex + 1} / {images.length}</span> : null}

      <dialog
        ref={dialog}
        className="stay-lightbox"
        aria-labelledby="stay-lightbox-title"
        onClose={() => { document.body.style.overflow = ''; opener.current?.focus(); }}
        onClick={event => { if (event.target === event.currentTarget) close(); }}
        onKeyDown={event => { trapTab(event); if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1); }}
      >
        <div className="stay-lightbox-head">
          <h2 id="stay-lightbox-title">{title}</h2>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button autoFocus type="button" className="stay-lightbox-close" onClick={close}><X size={18} aria-hidden="true" /><span className="stay-visually-hidden">Close photographs</span></button>
        </div>
        <figure
          className="stay-lightbox-stage"
          onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={event => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientX;
            touchStart.current = null;
            if (start != null && end != null && Math.abs(end - start) > 40) step(end < start ? 1 : -1);
          }}
        >
          <div className="stay-lightbox-image"><Image key={current.url} src={current.url!} alt={current.altText || `${title}, view ${index + 1}`} fill sizes="92vw" /></div>
          {current.caption ? <figcaption>{current.caption}</figcaption> : null}
          {images.length > 1 ? <>
            <button type="button" className="stay-lightbox-arrow is-prev" onClick={() => step(-1)}><ChevronLeft size={22} aria-hidden="true" /><span className="stay-visually-hidden">Previous photo</span></button>
            <button type="button" className="stay-lightbox-arrow is-next" onClick={() => step(1)}><ChevronRight size={22} aria-hidden="true" /><span className="stay-visually-hidden">Next photo</span></button>
          </> : null}
        </figure>
        {images.length > 1 ? (
          <div className="stay-lightbox-thumbs">
            {images.map((photo, position) => (
              <button type="button" key={photo.id || photo.url} aria-current={position === index || undefined} onClick={() => setIndex(position)} aria-label={`Show photo ${position + 1}`}>
                <Image src={photo.url!} alt="" fill sizes="96px" />
              </button>
            ))}
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
