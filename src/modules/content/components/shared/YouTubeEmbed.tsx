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
  const validVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId);

  if (!validVideoId) {
    return <p className="text-sm text-muted">El video de YouTube no es válido.</p>;
  }

  const parameters = new URLSearchParams({
    controls: "1",
    fs: "1",
    hl: "es",
    iv_load_policy: "3",
    playsinline: "1",
    rel: "0",
  });
  if (startAt && startAt > 0) {
    parameters.set("start", String(Math.trunc(startAt)));
  }
  if (endAt && endAt > 0) {
    parameters.set("end", String(Math.trunc(endAt)));
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-black/10 dark:ring-white/10">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
