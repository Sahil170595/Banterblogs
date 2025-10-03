'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface TimelineEvent {
  episode: string;
  date: string;
  highlight: string;
  complexity: number;
  description: string;
  icon: string;
  milestone: boolean;
}

const timelineEvents: TimelineEvent[] = [
  {
    episode: "Episode 1",
    date: "Sep 7, 2025",
    highlight: "Empty Markdown Files",
    complexity: 10,
    description: "Four empty docs, infinite possibility",
    icon: "📝",
    milestone: true,
  },
  {
    episode: "Episode 15",
    date: "Sep 12, 2025",
    highlight: "First AI Integration",
    complexity: 45,
    description: "Multi-LLM architecture begins",
    icon: "🧠",
    milestone: true,
  },
  {
    episode: "Episode 30",
    date: "Sep 20, 2025",
    highlight: "Voice Control System",
    complexity: 70,
    description: "Real-time audio processing",
    icon: "🎙️",
    milestone: true,
  },
  {
    episode: "Episode 41",
    date: "Sep 24, 2025",
    highlight: "Local Ollama Integration",
    complexity: 85,
    description: "Complete offline capability",
    icon: "🏠",
    milestone: true,
  },
  {
    episode: "Episode 53",
    date: "Sep 26, 2025",
    highlight: "Enterprise OAuth",
    complexity: 99,
    description: "Production-ready security",
    icon: "🔐",
    milestone: true,
  },
];

export function DevelopmentTimeline() {
  const [activeEpisode, setActiveEpisode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEpisode((prev) => (prev + 1) % timelineEvents.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-gradient-to-br from-background via-card to-muted/20 overflow-hidden noise-overlay">
      {/* Holographic background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.1),transparent_70%)]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, 20],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold mb-4"
          >
            <span className="gradient-text">The Evolution Journey</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Watch the rapid evolution from empty docs to enterprise-grade local AI assistant
          </motion.p>
        </div>

        {/* Timeline visualization */}
        <div className="relative max-w-6xl mx-auto">
          {/* Timeline line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary transform -translate-y-1/2" />
          
          {/* Timeline events */}
          {timelineEvents.map((event, index) => (
            <motion.div
              key={event.episode}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative flex items-center mb-16 ${
                index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              {/* Event card */}
              <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`relative p-6 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
                    activeEpisode === index
                      ? 'bg-gradient-to-r from-primary/20 to-accent/20 border-primary/50 shadow-lg shadow-primary/10'
                      : 'bg-card/60 border-border hover:border-primary/30'
                  }`}
                  onClick={() => setActiveEpisode(index)}
                >
                  {/* Holographic border effect */}
                  {activeEpisode === index && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 opacity-50 animate-pulse" />
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{event.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{event.episode}</h3>
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-bold text-primary mb-2">{event.highlight}</h4>
                    <p className="text-muted-foreground mb-4">{event.description}</p>
                    
                    {/* Complexity meter */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Complexity:</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            event.complexity >= 80 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                            event.complexity >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                            event.complexity >= 40 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                            'bg-gradient-to-r from-green-400 to-green-500'
                          }`}
                          style={{ width: `${event.complexity}%` }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${event.complexity}%` }}
                          transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{event.complexity}/100</span>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Timeline marker */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <motion.div
                  className={`w-6 h-6 rounded-full border-4 transition-all duration-300 ${
                    activeEpisode === index
                      ? 'bg-primary border-primary shadow-lg shadow-primary/50'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                  animate={activeEpisode === index ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {event.milestone && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-ping" />
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active episode details */}
        <motion.div
          key={activeEpisode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mt-16"
        >
          <div className="max-w-4xl mx-auto p-8 rounded-xl bg-gradient-to-r from-card/60 to-card/80 backdrop-blur-xl border border-border">
            <h3 className="text-2xl font-bold mb-4">
              Currently Viewing: {timelineEvents[activeEpisode].episode}
            </h3>
            <p className="text-lg text-muted-foreground">
              {timelineEvents[activeEpisode].description}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

