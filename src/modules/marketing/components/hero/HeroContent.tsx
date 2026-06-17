import { ArrowRight, Play, Star } from "lucide-react";
import Link from "next/link";
import type { Tag } from "@/modules/marketing/types/hero";
import { heroContentData } from "@/modules/marketing/data/hero";

const {
  badge,
  titleParts,
  description,
  tags,
  ctaPrimary,
  ctaSecondary,
  socialProof,
} = heroContentData;

const tagStyles: Record<Tag["color"], string> = {
  yellow: "badge-yellow",
  purple: "badge-purple",
  green: "badge-green",
};

export default function HeroContent() {
  return (
    <section
      aria-labelledby="hero-title"
      className="text-center lg:text-left fadein"
    >
      <header>
        <span className="badge-yellow inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6">
          <span className="pdot" aria-hidden="true" />
          {badge}
        </span>

        <h1 id="hero-title" className="hero-title mb-[18px]">
          {titleParts.map((part, index) => (
            <span key={index}>
              {index === 1 ? (
                <span className="grad-text">{part}</span>
              ) : (
                part
              )}

              {index < titleParts.length - 1 && <br />}
            </span>
          ))}
        </h1>

        <p className="hero-description mb-7 max-w-lg mx-auto lg:mx-0">
          {description}
        </p>
      </header>

      <ul className="flex gap-2 justify-center lg:justify-start mb-7 flex-wrap">
        {tags.map((tag) => (
          <li key={tag.label} className="list-none">
            <span
              className={`${tagStyles[tag.color]} px-3 py-1.5 rounded-full text-xs font-semibold`}
            >
              {tag.label}
            </span>
          </li>
        ))}
      </ul>

      <nav aria-label="Acciones principales" className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
        <Link
          href="/registro"
          className="btn-primary px-8 py-3.5 rounded-2xl text-small flex items-center justify-center gap-2 shadow-hero-cta"
        >
          {ctaPrimary}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>

        <Link
          href="/como-funciona"
          className="btn-outline px-8 py-3.5 rounded-2xl text-small flex items-center justify-center gap-2"
        >
          <Play
            size={13}
            className="fill-white"
            aria-hidden="true"
          />
          {ctaSecondary}
        </Link>
      </nav>
      <aside
        aria-label="Indicadores de confianza"
        className="flex items-center gap-5 justify-center lg:justify-start flex-wrap"
      >
        <div
          className="flex -space-x-2"
          aria-label="Usuarios en lista de espera"
        >
          {socialProof.users.map((user, index) => (
            <div
              key={user.bg}
              className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold"
              style={{
                background: user.bg,
              }}
              aria-hidden="true"
            >
              {user.initial}
            </div>
          ))}
        </div>

        <span className="text-muted text-xs">
          {socialProof.text}
        </span>

        <span
          className="text-muted text-xs"
          aria-hidden="true"
        >
          ·
        </span>

        <span className="text-muted text-xs flex items-center gap-1">
          <Star
            size={11}
            className="text-accent fill-accent"
            aria-hidden="true"
          />
          {socialProof.note}
        </span>
      </aside>
    </section>
  );
}