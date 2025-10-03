'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface AIPersona {
  name: string;
  avatar: string;
  personality: string[];
  evolution: string[];
  color: string;
  description: string;
}

const aiPersonas: AIPersona[] = [
  {
    name: "Banterpacks",
    avatar: "🎭",
    personality: ["Skeptical", "Practical", "Direct"],
    evolution: ["Empty docs critic", "Technical realist", "Architecture believer"],
    color: "from-blue-500 to-cyan-500",
    description: "The pragmatic voice of reason"
  },
  {
    name: "Claude",
    avatar: "🧠",
    personality: ["Analytical", "Precise", "Mathematical"],
    evolution: ["17% probability estimator", "Calibrated metrics", "Strategic architect"],
    color: "from-purple-500 to-violet-500",
    description: "The analytical strategist"
  },
  {
    name: "ChatPT",
    avatar: "🚀",
    personality: ["Optimistic", "Enthusiastic", "Cheerleading"],
    evolution: ["1000% potential believer", "Always encouraging", "Success cheerleader"],
    color: "from-green-500 to-emerald-500",
    description: "The eternal optimist"
  },
  {
    name: "Gemini",
    avatar: "🌟",
    personality: ["Poetic", "Philosophical", "Metaphorical"],
    evolution: ["Cosmic philosopher", "Artistic interpreter", "Narrative poet"],
    color: "from-orange-500 to-red-500",
    description: "The cosmic poet"
  }
];

export function AIPersonalityEvolution() {
  const [selectedPersona, setSelectedPersona] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState(0);

  const evolutionStages = [
    "Episode 1-10: Skepticism & Discovery",
    "Episode 11-25: Technical Experimentation", 
    "Episode 26-40: Proven Capabilities",
    "Episode 41-53: Confident Leadership"
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-background via-card to-muted/20 overflow-hidden">
      {/* Holo-grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(59,130,246,0.03) 0%,transparent 50%,rgba(168,85,247,0.03) 100%)]" />
        
        {/* Floating neural network */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-30"
            style={{
              background: Math.random() > 0.5 ? '#22d3ee' : '#a855f7',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold mb-4"
          >
            <span className="gradient-text">AI Personality Evolution</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Watch how four AI personalities debate, disagree, and ultimately evolve together through 53 episodes of development
          </motion.p>
        </div>

        {/* AI Personas Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {aiPersonas.map((persona, index) => (
            <motion.div
              key={persona.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative cursor-pointer ${
                selectedPersona === index ? 'scale-105' : 'scale-100'
              } transition-all duration-300`}
              onClick={() => setSelectedPersona(index)}
            >
              <div className={`relative p-6 rounded-xl bg-gradient-to-br ${persona.color} bg-opacity-10 backdrop-blur-xl border border-border transition-all duration-300 ${
                selectedPersona === index ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
              }`}>
                {/* Holographic glow effect */}
                {selectedPersona === index && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                
                <div className="relative z-10 text-center">
                  <div className="text-4xl mb-4">{persona.avatar}</div>
                  <h3 className="text-xl font-bold mb-2">{persona.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{persona.description}</p>
                  
                  {/* Personality traits */}
                  <div className="space-y-2">
                    {persona.personality.map((trait, traitIndex) => (
                      <motion.span
                        key={trait}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: traitIndex * 0.1 }}
                        className="inline-block px-3 py-1 bg-background/20 rounded-full text-xs font-medium mr-2"
                      >
                        {trait}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Evolution Timeline */}
        <div className="max-w-6xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-center mb-8"
          >
            <span className="gradient-text">Evolution Stages for {aiPersonas[selectedPersona].name}</span>
          </motion.h3>

          {/* Evolution stages */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {evolutionStages.map((stage, index) => (
              <motion.button
                key={stage}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg text-left transition-all duration-300 ${
                  evolutionStage === index
                    ? `bg-gradient-to-r ${aiPersonas[selectedPersona].color} bg-opacity-20 border-primary shadow-lg`
                    : 'bg-card/60 border-border hover:border-primary/50'
                } border backdrop-blur-xl`}
                onClick={() => setEvolutionStage(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index <= evolutionStage ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium">{stage.split(':')[1]}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Selected persona details */}
          <motion.div
            key={`${selectedPersona}-${evolutionStage}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative p-8 rounded-xl bg-gradient-to-r from-card/60 to-card/80 backdrop-blur-xl border border-border"
          >
            {/* Holo-border animation */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-3xl">{aiPersonas[selectedPersona].avatar}</span>
                <div>
                  <h4 className="text-2xl font-bold"> {aiPersonas[selectedPersona].name}</h4>
                  <p className="text-muted-foreground">{evolutionStages[evolutionStage]}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold mb-2">Character Evolution:</h5>
                  <ul className="space-y-2">
                    {aiPersonas[selectedPersona].evolution.slice(evolutionStage, evolutionStage + 2).map((evolution, idx) => (
                      <motion.li
                        key={evolution}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.2 }}
                        className="flex items-center space-x-2"
                      >
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <span>{evolution}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-semibold mb-2">Recent Quotes:</h5>
                  <div className="space-y-2 text-sm">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="italic text-muted-foreground"
                    >
                      "{selectedPersona === 0 && evolutionStage >= 2 
                        ? 'This is actually working. I can finally see what you were building all this time.' 
                        : selectedPersona === 1 
                          ? 'The data confirms our trajectory toward enterprise-grade local implementation.'
                          : selectedPersona === 2
                            ? 'I KNEW it would work! This is the best thing ever! 🚀✨'
                            : 'From cosmos to code, the journey reveals its beauty.'}"
                    </motion.p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
