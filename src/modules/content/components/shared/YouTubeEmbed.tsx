"use client";

import { PlayCircle, X } from "lucide-react";
import { useState } from "react";

export function YouTubeEmbed({
  videoId,
  title,
  startAt,
  endAt,
}: {
  videoId: string;
  title: string;
  startAt?: number | null;
  endAt?: number | null;
}) {
  const [active, setActive] = useState(false);
  const validVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId);

  if (!validVideoId) {
    return <p className="text-sm text-muted">El video de YouTube no es válido.</p>;
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <PlayCircle aria-hidden="true" className="h-4 w-4" />
        Reproducir en EduNivel
      </button>
    );
  }

  const parameters = new URLSearchParams({
    controls: "1",
    fs: "1",
    playsinline: "1",
  });
  if (startAt && startAt > 0) parameters.set("start", String(startAt));
  if (endAt && endAt > 0) parameters.set("end", String(endAt));

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setActive(false)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-elevated hover:text-foreground"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Cerrar video
        </button>
      </div>
      <div className="aspect-video min-h-52 overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?${parameters.toString()}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
