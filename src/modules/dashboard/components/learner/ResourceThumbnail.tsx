"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import {
  ResourceTypeIcon,
  resourceTypeLabels,
} from "@/modules/content/components/admin/ContentBadges";
import { getYoutubeThumbnailUrl } from "@/modules/dashboard/domain/learner-presentation";

const thumbnailVisuals = {
  [ResourceType.NOTE]: {
    surface: "from-emerald-500/25 via-emerald-400/10 to-teal-950/15 dark:from-emerald-500/25 dark:via-emerald-950/60 dark:to-slate-950",
    icon: "bg-emerald-600 text-white shadow-emerald-950/20",
  },
  [ResourceType.QUIZ]: {
    surface: "from-violet-500/25 via-fuchsia-400/10 to-violet-950/15 dark:from-violet-500/25 dark:via-violet-950/60 dark:to-slate-950",
    icon: "bg-violet-600 text-white shadow-violet-950/20",
  },
  [ResourceType.YOUTUBE]: {
    surface: "from-red-500/25 via-rose-400/10 to-slate-950/20 dark:from-red-500/25 dark:via-rose-950/55 dark:to-slate-950",
    icon: "bg-red-600 text-white shadow-red-950/25",
  },
  [ResourceType.PDF]: {
    surface: "from-rose-500/25 via-orange-400/10 to-rose-950/15 dark:from-rose-500/25 dark:via-rose-950/60 dark:to-slate-950",
    icon: "bg-rose-600 text-white shadow-rose-950/20",
  },
  [ResourceType.FILE]: {
    surface: "from-slate-500/25 via-slate-300/15 to-blue-950/15 dark:from-slate-500/25 dark:via-slate-800/65 dark:to-slate-950",
    icon: "bg-slate-700 text-white shadow-slate-950/20",
  },
  [ResourceType.LINK]: {
    surface: "from-amber-400/30 via-orange-300/10 to-amber-950/15 dark:from-amber-400/20 dark:via-amber-950/55 dark:to-slate-950",
    icon: "bg-amber-500 text-white shadow-amber-950/20",
  },
  [ResourceType.GAME]: {
    surface: "from-fuchsia-500/25 via-violet-400/10 to-fuchsia-950/15 dark:from-fuchsia-500/25 dark:via-fuchsia-950/55 dark:to-slate-950",
    icon: "bg-fuchsia-600 text-white shadow-fuchsia-950/20",
  },
  [ResourceType.IMAGE]: {
    surface: "from-cyan-500/25 via-sky-400/10 to-cyan-950/15 dark:from-cyan-500/25 dark:via-cyan-950/55 dark:to-slate-950",
    icon: "bg-cyan-600 text-white shadow-cyan-950/20",
  },
  [ResourceType.AUDIO]: {
    surface: "from-blue-500/25 via-indigo-400/10 to-blue-950/15 dark:from-blue-500/25 dark:via-blue-950/55 dark:to-slate-950",
    icon: "bg-blue-600 text-white shadow-blue-950/20",
  },
} satisfies Record<
  ResourceType,
  { surface: string; icon: string }
>;

export function ResourceThumbnail({
  type,
  title,
  youtubeVideoId,
  duration,
}: {
  type: ResourceType;
  title: string;
  youtubeVideoId: string | null;
  duration: string | null;
}) {
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);
  const visual = thumbnailVisuals[type];
  const youtubeThumbnail =
    type === ResourceType.YOUTUBE
      ? getYoutubeThumbnailUrl(youtubeVideoId)
      : null;
  const showYoutubeThumbnail = Boolean(
    youtubeThumbnail && failedVideoId !== youtubeVideoId,
  );

  return (
    <div
      aria-hidden="true"
      className={`relative aspect-video w-full overflow-hidden bg-gradient-to-br ${visual.surface}`}
    >
      {showYoutubeThumbnail && youtubeThumbnail ? (
        <Image
          src={youtubeThumbnail}
          alt=""
          fill
          sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 100vw"
          className="object-cover transition duration-300 motion-reduce:transition-none group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
          onError={() => setFailedVideoId(youtubeVideoId)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center gap-4 px-6">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] shadow-xl ${visual.icon}`}
          >
            <ResourceTypeIcon type={type} className="h-8 w-8" />
          </span>
          <p className="line-clamp-2 max-w-[15rem] text-base font-extrabold leading-5 text-[var(--student-text)]">
            {title}
          </p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-slate-950/10" />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/65 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-white shadow-sm backdrop-blur-md">
        <ResourceTypeIcon type={type} className="h-3.5 w-3.5" />
        {resourceTypeLabels[type]}
      </span>

      {type === ResourceType.YOUTUBE ? (
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-red-600 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      ) : null}

      {type === ResourceType.YOUTUBE && duration ? (
        <span className="absolute bottom-3 right-3 rounded-md bg-slate-950/80 px-2 py-1 text-[0.68rem] font-bold tabular-nums text-white shadow-sm">
          {duration}
        </span>
      ) : null}
    </div>
  );
}
