import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { entranceGroup } from '@/components/motion/entrance';
import { ButtonLink } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { ProfileLayout } from '@/components/ui/ProfileLayout';
import { Section } from '@/components/ui/Section';
import { StatRow } from '@/components/ui/StatRow';
import { ABOUT_LINKS, ECOSYSTEM } from '@/lib/about';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'About Chimera',
  description:
    'Constitutional AI ecosystem built by Sahil Kadadekar — 9 repos across Python, Rust, TypeScript, and C#. Constitutional enforcement, cryptographic provenance, and self-improving alignment.',
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'About Chimera | Chimeraforge',
    description:
      'Constitutional AI ecosystem · 9 repos, 4 languages, Rust alignment runtime, multi-model debate, cryptographic provenance.',
    url: 'https://chimeraforge.vercel.app/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Chimera | Chimeraforge',
    description:
      'Constitutional AI ecosystem · 9 repos, 4 languages, Rust alignment runtime, multi-model debate, cryptographic provenance.',
  },
};

const SECTIONS = [
  { id: 'what', label: 'What This Is' },
  { id: 'ecosystem', label: 'The Ecosystem' },
  { id: 'site', label: 'About This Site' },
];
// the R2 reading type: 18px in the prose colour, ~77 characters a line
const READING = 'max-w-[39rem] text-copy-18 text-prose';
// the first section's heading closes the entrance, after the rail's title and
// identity; phones hide the rail index, so this keeps them at three groups
const FIRST_HEADING_GROUP = 2;

export default function AboutPage() {
  return (
    <ProfileLayout
      eyebrow="About"
      title="Constitutional AI with signed, replayable decision traces."
      lede={
        <>
          Chimera is a constitutional AI enforcement architecture. Every action routes through
          an embedding-based safety classifier, escalates to multi-model debate when uncertain,
          and produces cryptographically signed provenance chains with zero-knowledge proofs.
          The system self-improves: debate outcomes train the alignment encoder through an RLAIF loop.
        </>
      }
      sections={SECTIONS}
      identity={
        <div className="space-y-4">
          <p className="text-label-13 text-muted-foreground">
            Built by <span className="font-medium text-foreground">Sahil Kadadekar</span> &middot;
            Solo architect &middot; Sep 2025 &ndash; Present
          </p>
          <StatRow
            label="The program in numbers"
            items={[
              { value: MEASUREMENTS.SHORT, label: 'Research Measurements' },
              { value: REPORTS.DISPLAY, label: 'Technical Reports' },
            ]}
          />
        </div>
      }
    >
      <div className="mt-14 md:mt-20">
        <Section id="what" title="What This Is" headingProps={entranceGroup(FIRST_HEADING_GROUP)}>
          <div className="space-y-10">
            <div>
              <h3 className="text-heading-20 text-foreground">The architecture</h3>
              <p className={`mt-3 ${READING}`}>
                A constitutional AI enforcement system spanning Python and Rust. An embedding
                fast-path router handles routine queries and escalates uncertain ones to a
                multi-model debate engine with heat-based escalation and three consensus
                algorithms. The Rust runtime (7 crates) provides Ed25519 provenance chains, BFT consensus,
                and zero-knowledge proofs for cross-trust-boundary communication. JARVIS is the agent layer —
                multi-provider chat, voice (Whisper/Piper), semantic memory, tool execution with
                human-in-the-loop approval, and proactive intelligence.
              </p>
            </div>
            <div>
              <h3 className="text-heading-20 text-foreground">The research</h3>
              <p className={`mt-3 ${READING}`}>
                {MEASUREMENTS.DISPLAY} measurements across {REPORTS.DISPLAY} technical reports. Not wall-clock approximations —
                CUDA event timing with defined hardware profiles and statistical methodology. Covers
                model loading, ONNX conversion, TensorRT compilation, KV cache optimization,
                multi-agent coordination, and safety analysis across Ollama, vLLM, and TGI.
              </p>
            </div>
          </div>
        </Section>

        <Section id="ecosystem" title="The Ecosystem">
          <ul>
            {ECOSYSTEM.map((repo, index) => (
              <Reveal as="li" key={repo.name}>
                <ListRow index={String(index + 1).padStart(2, '0')} title={repo.name} meta={repo.lang} description={repo.what} />
              </Reveal>
            ))}
          </ul>
          <p className="mt-6 text-label-13 text-muted-foreground">9 repositories &middot; Python, Rust, TypeScript, C#</p>
        </Section>

        <Section id="site" title="About This Site">
          <div className="space-y-5">
            <p className={READING}>
              268 episodes were auto-generated from git commits across the nine repositories (per-commit stream
              archived 2026-06-26; each stream closes with a full retrospective). A multi-agent pipeline
              (Chimera Multi-Agent) ingested commits and benchmark data, generated roundtable-style
              commentary with four AI personas, and published to this Next.js site via GitHub + Vercel.
            </p>
            <p className={READING}>
              The research archive surfaces {REPORTS.DISPLAY} technical reports with phase grouping, searchable titles,
              and ISR with 15-minute revalidation. Every report links to real measurements and defined
              methodology.
            </p>
          </div>
        </Section>

        <div className="page-section flex flex-wrap gap-3">
          {ABOUT_LINKS.map((link, index) => (
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
