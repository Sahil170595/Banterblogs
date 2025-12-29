'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ShieldCheck, Brain, Sparkles, Rocket } from 'lucide-react';

type IconType = typeof ShieldCheck;

type Tone = 'primary' | 'accent' | 'amber' | 'emerald';

interface AIPersona {
  name: string;
  icon: IconType;
  personality: string[];
  evolution: string[];
  tone: Tone;
  description: string;
  quote: string;
}

const toneStyles: Record<Tone, { text: string; bg: string; ring: string }> = {
  primary: { text: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/40' },
  accent: { text: 'text-accent', bg: 'bg-accent/10', ring: 'ring-accent/40' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/40' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/40' },
};

const aiPersonas: AIPersona[] = [
  {
    name: 'Banterpacks',
    icon: ShieldCheck,
    personality: ['Skeptical', 'Practical', 'Direct'],
    evolution: ['Empty docs critic', 'Technical realist', 'Architecture believer'],
    tone: 'primary',
    description: 'The pragmatic voice of reason',
    quote: 'This is actually working. I can finally see what you were building.',
  },
  {
    name: 'Claude',
    icon: Brain,
    personality: ['Analytical', 'Precise', 'Mathematical'],
    evolution: ['17% probability estimator', 'Calibrated metrics', 'Strategic architect'],
    tone: 'accent',
    description: 'The analytical strategist',
    quote: 'The data confirms our trajectory toward enterprise-grade local implementation.',
  },
  {
    name: 'ChatPT',
    icon: Sparkles,
    personality: ['Optimistic', 'Enthusiastic', 'Cheerleading'],
    evolution: ['1000% potential believer', 'Always encouraging', 'Success cheerleader'],
    tone: 'emerald',
    description: 'The momentum amplifier',
    quote: 'I knew it would work. The momentum is real.',
  },
  {
    name: 'Gemini',
    icon: Rocket,
    personality: ['Poetic', 'Philosophical', 'Metaphorical'],
    evolution: ['Cosmic philosopher', 'Artistic interpreter', 'Narrative poet'],
    tone: 'amber',
    description: 'The cosmic poet',
    quote: 'From cosmos to code, the journey keeps revealing new patterns.',
  },
];

export function AIPersonalityEvolution() {
  const [selectedPersona, setSelectedPersona] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState(0);

  const evolutionStages = [
    'Episode 1-10: Skepticism and discovery',
    'Episode 11-25: Technical experimentation',
    'Episode 26-40: Proven capabilities',
    'Episode 41-53: Confident leadership',
  ];

  return (
    <section className="relative py-24">
      <div className="signal-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="container relative">
        <div className="max-w-3xl">
          <span className="signal-pill">Chimera Personalities</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">AI Personality Evolution</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Four AI perspectives collide, debate, and mature over 53 episodes of focused development.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {aiPersonas.map((persona, index) => {
            const tone = toneStyles[persona.tone];
            const Icon = persona.icon;
            const isActive = selectedPersona === index;

            return (
              <motion.button
                key={persona.name}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`signal-panel p-6 text-left transition ${isActive ? `ring-2 ${tone.ring}` : ''}`}
                onClick={() => setSelectedPersona(index)}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone.text}`}>
                    Persona
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-semibold text-foreground">{persona.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{persona.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {persona.personality.map((trait) => (
                    <span
                      key={trait}
                      className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-12">
          <h3 className="text-2xl font-bold tracking-tight">
            Evolution stages for {aiPersonas[selectedPersona].name}
          </h3>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {evolutionStages.map((stage, index) => (
              <motion.button
                key={stage}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => setEvolutionStage(index)}
                className={`signal-panel p-4 text-left transition ${
                  evolutionStage === index ? 'ring-2 ring-primary/40' : 'hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      index <= evolutionStage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {stage.split(':')[1]}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          <motion.div
            key={`${selectedPersona}-${evolutionStage}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="signal-panel-strong mt-8 p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stage focus</p>
                <h4 className="mt-2 text-2xl font-semibold text-foreground">
                  {aiPersonas[selectedPersona].name} - {evolutionStages[evolutionStage]}
                </h4>
              </div>
              <div className="text-sm text-muted-foreground">
                {aiPersonas[selectedPersona].description}
              </div>
            </div>

            <div className="signal-divider my-6" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h5 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Character evolution
                </h5>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {aiPersonas[selectedPersona].evolution
                    .slice(evolutionStage, evolutionStage + 2)
                    .map((evolution) => (
                      <li key={evolution} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span>{evolution}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recent quote
                </h5>
                <p className="mt-3 text-sm italic text-muted-foreground">
                  &ldquo;{aiPersonas[selectedPersona].quote}&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
