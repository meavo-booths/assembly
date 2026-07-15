"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CarouselFile = {
  id: string;
  fileName: string;
  caption: string;
};

export function ResourceImageCarousel({ files }: { files: CarouselFile[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || files.length === 0) return;

    const width = container.clientWidth;
    if (width <= 0) return;

    const nextIndex = Math.round(container.scrollLeft / width);
    setIndex(Math.max(0, Math.min(nextIndex, files.length - 1)));
  }, [files.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateIndexFromScroll, { passive: true });
    return () => container.removeEventListener("scroll", updateIndexFromScroll);
  }, [updateIndexFromScroll]);

  const scrollTo = useCallback(
    (nextIndex: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const clamped = Math.max(0, Math.min(nextIndex, files.length - 1));
      container.scrollTo({ left: clamped * container.clientWidth, behavior: "smooth" });
      setIndex(clamped);
    },
    [files.length],
  );

  if (files.length === 0) return null;

  const activeCaption = files[index]?.caption?.trim();

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {files.map((file) => (
            <div key={file.id} className="w-full shrink-0 snap-center">
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/resource-files/${file.id}`}
                  alt={file.caption || file.fileName}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>

        {files.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollTo(index + 1)}
              disabled={index === files.length - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow disabled:opacity-40"
            >
              ›
            </button>
          </>
        )}
      </div>

      {activeCaption && <p className="text-sm text-slate-700">{activeCaption}</p>}

      {files.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-slate-600">
            {index + 1} / {files.length}
          </p>
          <div className="flex gap-1.5">
            {files.map((file, fileIndex) => (
              <button
                key={file.id}
                type="button"
                onClick={() => scrollTo(fileIndex)}
                aria-label={`Go to image ${fileIndex + 1}`}
                className={`h-2 w-2 rounded-full ${
                  fileIndex === index ? "bg-brand-600" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
