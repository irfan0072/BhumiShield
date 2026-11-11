import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for public pages, so every page looks the same.
 *
 *   <PublicHero image="digital-mouza-map" title=… subtitle=… icon={Map}>
 *     …the page's MAIN action (search box / form) goes here, inside the first screen…
 *   </PublicHero>
 *   <PublicSection>…rest of the page…</PublicSection>
 *
 * Images live in /public/assets/land/<name>.webp and <name>-sm.webp:
 *   landtech-hackathon-hero (drone over paddy fields; white fade on the left)
 *   digital-mouza-map (aerial cadastral plots)
 *   hero-banner (family using a land app at home)
 *   helpline-16122-bg (helpline call centre)
 * Do not use check-before-buy: its deed shows a foreign emblem and Dubai coordinates.
 */
export type LandImage =
  | 'landtech-hackathon-hero'
  | 'digital-mouza-map'
  | 'hero-banner'
  | 'helpline-16122-bg';

export const landImg = (name: LandImage, small = false) => `/assets/land/${name}${small ? '-sm' : ''}.webp`;

export const PublicHero: React.FC<{
  image: LandImage;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  /** object-position of the background image */
  position?: string;
  /** dark = green overlay with white text; light = white fade with dark text */
  tone?: 'light' | 'dark';
  children?: React.ReactNode;
  className?: string;
}> = ({ image, title, subtitle, icon: Icon, position = 'center', tone = 'dark', children, className }) => (
  <section className={cn('relative isolate overflow-hidden', className)}>
    <picture>
      <source media="(max-width: 640px)" srcSet={landImg(image, true)} />
      <img src={landImg(image)} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" style={{ objectPosition: position }} />
    </picture>
    <div
      className="absolute inset-0 -z-10"
      style={{
        background:
          tone === 'dark'
            ? 'linear-gradient(90deg, rgba(0,58,42,.94) 0%, rgba(0,58,42,.82) 45%, rgba(0,58,42,.45) 100%)'
            : 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,.92) 40%, rgba(255,255,255,.35) 100%)',
      }}
    />
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className={cn('flex items-center gap-3', tone === 'dark' ? 'text-white' : 'text-slate-900')}>
        {Icon && (
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              tone === 'dark' ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-emerald-50 text-[#006A4E]'
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className={cn('mt-0.5 text-sm', tone === 'dark' ? 'text-emerald-50/90' : 'text-slate-600')}>{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="mt-4 sm:mt-5">{children}</div>}
    </div>
  </section>
);

/** Page body container with consistent width and spacing. */
export const PublicSection: React.FC<{ children: React.ReactNode; className?: string; muted?: boolean }> = ({
  children,
  className,
  muted,
}) => (
  <section className={cn(muted && 'border-t border-slate-100 bg-slate-50/70')}>
    <div className={cn('mx-auto max-w-7xl px-4 py-6 sm:py-8', className)}>{children}</div>
  </section>
);

/** White card used for the main tool of a page (search box, form, result). */
export const PublicCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5', className)}>
    {children}
  </div>
);
