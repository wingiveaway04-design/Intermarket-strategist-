"use client";

import { useEffect, useState } from "react";

type ChartImage = { url: string; alt: string };

export default function TradeImageGallery({ images, instrument }: { images: ChartImage[]; instrument: string }) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((current) => current === null ? null : (current + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((current) => current === null ? null : (current - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, images.length]);

  if (!images.length) return null;

  return (
    <>
      <section className="mt-6" aria-label={instrument + " chart images"}>
        {images.length > 1 && <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">{images.length} chart images · Select any image to enlarge</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={"Enlarge chart " + (index + 1) + " for " + instrument}
              className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <img src={image.url} alt={image.alt} loading="lazy" className="h-auto max-h-[520px] w-full object-contain transition duration-200 group-hover:scale-[1.015]" />
              <span className="block border-t border-white/10 px-3 py-2 text-xs text-slate-400 group-hover:text-cyan-200">View full size · Chart {index + 1}</span>
            </button>
          ))}
        </div>
      </section>

      {active !== null && images[active] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={"Enlarged " + instrument + " chart"}
          onClick={() => setActive(null)}
        >
          <button type="button" onClick={() => setActive(null)} aria-label="Close enlarged chart" className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-slate-900 px-4 py-2 text-sm text-white">Close ✕</button>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Previous chart" onClick={(event) => { event.stopPropagation(); setActive((active - 1 + images.length) % images.length); }} className="absolute left-2 z-10 rounded-full border border-white/20 bg-slate-900/90 px-4 py-3 text-xl text-white sm:left-5">‹</button>
              <button type="button" aria-label="Next chart" onClick={(event) => { event.stopPropagation(); setActive((active + 1) % images.length); }} className="absolute right-2 z-10 rounded-full border border-white/20 bg-slate-900/90 px-4 py-3 text-xl text-white sm:right-5">›</button>
            </>
          )}
          <img
            src={images[active].url}
            alt={images[active].alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-full object-contain"
          />
          {images.length > 1 && <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">{active + 1} / {images.length} · Use arrow keys to browse</p>}
        </div>
      )}
    </>
  );
}
