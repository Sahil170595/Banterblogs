import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronRight, ExternalLink, Github, Linkedin, type LucideIcon } from 'lucide-react';
import { LivePulse } from '@/components/motion/LivePulse';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import { ButtonLink } from '@/components/ui/Button';
import { PROFILE_ITEMS_AFTER, ProfileLayout } from '@/components/ui/ProfileLayout';
import { Section } from '@/components/ui/Section';
import { cn } from '@/lib/cn';
import {
  EDUCATION,
  EXPERIENCE,
  HERO_HEADLINE,
  HERO_SUMMARY,
  NEXT_LINKS,
  PROFILE_LINKS,
  RESEARCH,
  SKILLS,
  type Experience,
  type ResearchItem,
} from '@/lib/work';

const METADATA_DESCRIPTION =
  'ML engineer and independent researcher · LLM serving and quantization safety, constitutional AI systems, upstream PyTorch/vLLM/Ollama/Triton fixes. A paper presented at an ICML 2026 workshop, technical reports, and two PyPI tools.';

export const metadata: Metadata = {
  alternates: { canonical: '/work' },
  title: 'Work',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Work | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/work',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

const SECTIONS = [
  { id: 'research', label: 'Research & Open Source' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Technical Skills' },
];
const LINK_ICONS: Record<string, LucideIcon> = { GitHub: Github, LinkedIn: Linkedin, ORCID: ExternalLink };
// the research rows that join the first-load entrance, after the rail
const ENTRANCE_ROWS = 2;
// bullets an entry shows before the rest fold away, so the page skims as
// headlines (it was 9,226px of bullets at 1440): a research entry already
// leads with its meta line and evidence, a role with the first two of its story
const RESEARCH_VISIBLE_BULLETS = 1;
const ROLE_VISIBLE_BULLETS = 2;
const CURRENT_ROLE = /Present$/;

const isExternal = (href: string) => /^https?:\/\//.test(href);
const ordinal = (index: number) => String(index + 1).padStart(2, '0');

/** a row's title as its link: ember with the row's hairline under the pointer (.row-link in globals.css) */
function TitleLink({ href, children }: { href: string; children: ReactNode }) {
  const external = isExternal(href);
  return (
    <Link href={href} className="row-link" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}{' '}
      {external ? (
        <ArrowUpRight aria-hidden="true" className="row-arrow h-4 w-4 text-muted-foreground" />
      ) : (
        <ArrowRight aria-hidden="true" data-direction="forward" className="row-arrow h-4 w-4 text-muted-foreground" />
      )}
    </Link>
  );
}

const BULLET_LIST = 'max-w-[68ch] space-y-3 text-copy-16 text-prose';
// a long unbroken token (AWQ/GPTQ/…/GGUF;) breaks anywhere rather than widen a 320px page
const BULLET = 'relative pl-5 [overflow-wrap:anywhere] before:absolute before:left-0 before:top-[0.7em] before:h-1 before:w-1 before:rounded-full before:bg-foreground/30';

/**
 * An entry's bullets: the first `visible`, then the rest in one closed
 * disclosure (.more-details in globals.css), so the page skims as headlines
 * and every word stays on it, one click away.
 */
function Bullets({ items, visible }: { items: string[]; visible: number }) {
  const shown = items.slice(0, visible);
  const folded = items.slice(visible);
  return (
    <>
      <ul className={cn('mt-4', BULLET_LIST)}>
        {shown.map((bullet) => (
          <li key={bullet} className={BULLET}>
            {bullet}
          </li>
        ))}
      </ul>
      {folded.length > 0 && (
        <details className="more-details">
          <summary>
            <ChevronRight aria-hidden="true" className="more-chevron h-3.5 w-3.5" />
            <span className="more-closed">Show {folded.length} more</span>
            <span className="more-open">Show fewer</span>
          </summary>
          <ul className={cn('mt-3', BULLET_LIST)}>
            {folded.map((bullet) => (
              <li key={bullet} className={BULLET}>
                {bullet}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ResearchRow({ item, index }: { item: ResearchItem; index: number }) {
  return (
    <Reveal
      as="li"
      className="list-row grid gap-x-6 py-8 md:grid-cols-[2.5rem_minmax(0,1fr)]"
      {...(index < ENTRANCE_ROWS ? entranceItem(index, PROFILE_ITEMS_AFTER) : {})}
    >
      <span aria-hidden="true" className="hidden pt-1 font-mono text-label-13 text-muted-foreground md:block">
        {ordinal(index)}
      </span>
      <div className="min-w-0">
        <h3 className="text-heading-20 text-foreground">
          <TitleLink href={item.href}>{item.label}</TitleLink>
        </h3>
        {item.meta && <p className="mt-1.5 text-label-13 text-muted-foreground">{item.meta}</p>}
        <Bullets items={item.bullets} visible={RESEARCH_VISIBLE_BULLETS} />
        {item.evidence && item.evidence.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="mr-2 text-label-12-mono text-muted-foreground/80">Evidence</span>
            {item.evidence.map((evidence) => (
              <ButtonLink
                key={evidence.href}
                href={evidence.href}
                variant="ghost"
                size="sm"
                iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}
                className="px-2 py-1 text-left"
              >
                {evidence.label}
              </ButtonLink>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function RoleRow({ job }: { job: Experience }) {
  return (
    <Reveal as="li" className="list-row grid gap-x-8 gap-y-2 py-8 md:grid-cols-[9.5rem_minmax(0,1fr)]">
      <p className="pt-1 text-label-13 text-muted-foreground">{CURRENT_ROLE.test(job.dates) ? <LivePulse label={job.dates} /> : job.dates}</p>
      <div className="min-w-0">
        <h3 className="text-heading-20 text-foreground">{job.role}</h3>
        <p className="mt-1 text-copy-16 text-muted-foreground">
          {job.company} · {job.location}
        </p>
        <Bullets items={job.bullets} visible={ROLE_VISIBLE_BULLETS} />
      </div>
    </Reveal>
  );
}

export default function WorkPage() {
  return (
    <ProfileLayout
      eyebrow="Work"
      title={HERO_HEADLINE}
      lede={HERO_SUMMARY}
      sections={SECTIONS}
      identity={
        <div className="flex flex-wrap gap-2">
          {PROFILE_LINKS.map((link) => {
            const Icon = LINK_ICONS[link.label];
            return (
              <ButtonLink
                key={link.href}
                href={link.href}
                variant={isExternal(link.href) ? 'secondary' : 'primary'}
                icon={Icon ? <Icon className="h-4 w-4" /> : undefined}
                iconEnd={isExternal(link.href) ? undefined : <ArrowRight className="h-4 w-4" />}
              >
                {link.label}
              </ButtonLink>
            );
          })}
        </div>
      }
    >
      <div className="mt-14 md:mt-20">
        <Section id="research" title="Research & Open Source">
          <ul>
            {RESEARCH.map((item, index) => (
              <ResearchRow key={item.href} item={item} index={index} />
            ))}
          </ul>
        </Section>

        <Section id="experience" title="Experience">
          <ul>
            {EXPERIENCE.map((job) => (
              <RoleRow key={`${job.company}-${job.dates}`} job={job} />
            ))}
          </ul>
        </Section>

        <Section id="education" title="Education">
          <ul className="grid gap-x-8 md:grid-cols-2">
            {EDUCATION.map((edu) => (
              <Reveal as="li" key={edu.school} className="list-row py-6">
                <h3 className="text-heading-20 text-foreground">{edu.school}</h3>
                <p className="mt-1 text-label-13 text-muted-foreground">{edu.location}</p>
                <p className="mt-3 text-copy-16 text-prose">{edu.degree}</p>
                <p className="mt-2 flex items-center justify-between gap-4 text-label-13 text-muted-foreground">
                  <span>{edu.detail}</span>
                  <span>{edu.dates}</span>
                </p>
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section id="skills" title="Technical Skills">
          <dl>
            {SKILLS.map((skill) => (
              <Reveal key={skill.label} className="list-row grid gap-1 py-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8">
                <dt className="text-copy-16 font-semibold text-foreground">{skill.label}</dt>
                <dd className="text-copy-16 text-prose">{skill.items}</dd>
              </Reveal>
            ))}
          </dl>
        </Section>

        <div className="page-section flex flex-wrap gap-3">
          {NEXT_LINKS.map((link, index) => (
            <ButtonLink
              key={link.href}
              href={link.href}
              variant={index === 0 ? 'primary' : 'secondary'}
              iconEnd={index === 0 ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {link.label}
            </ButtonLink>
          ))}
        </div>
      </div>
    </ProfileLayout>
  );
}
