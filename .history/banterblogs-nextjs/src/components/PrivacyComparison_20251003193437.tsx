'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface ComparisonPoint {
  feature: string;
  cloudAI: string;
  localAI: string;
  icon: string;
}

const comparisonData: ComparisonPoint[] = [
  {
    feature: "Data Storage",
    cloudAI: "❌ Sent to Big Tech servers",
    localAI: "✅ Stays on your device",
    icon: "🗄️"
  },
  {
    feature: "Internet Required",
    cloudAI: "❌ Useless offline",
    localAI: "✅ Works completely offline",
    icon: "🌐"
  },
  {
    feature: "Cost",
    cloudAI: "💸 Subscription fees forever",
    localAI: "✅ One-time setup cost",
    icon: "💰"
  },
  {
    feature: "Privacy",
    cloudAI: "❌ Every chat monitored",
    localAI: "✅ Zero surveillance",
    icon: "🔒"
  },
  {
    feature: "Customization",
    cloudAI: "❌ Generic responses",
    localAI: "✅ Learns your personality",
    icon: "🎭"
  },
  {
    feature: "Speed",
    cloudAI: "🐌 Depends on internet",
    localAI: "⚡ Sub-200ms local processing",
    icon: "⚡"
  }
];

export function PrivacyComparison() {
  const [selectedPoint, setSelectedPoint] = useState(0);

  return (
    <section className="py-24 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Holographic matrix background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.02) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.02) 25%,transparent 25%)] bg-[length:20px 20px] opacity-30" />
        
        {/* Floating code snippets */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-mono text-xs text-green-400 opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [-20, 20],
              y: [-10, 10],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            {['local()', 'offline()', 'private()', 'secure()'][Math.floor(Math.random() * 4)]}
          </motion.div>
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
            <span className="gradient-text">Cloud vs Local AI</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Why settle for surveillance when you can have complete digital sovereignty?
          </motion.p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-16">
          {/* Cloud AI Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative p-8 rounded-xl bg-gradient-to-br from-red-900/20 to-red-800/10 backdrop-blur-xl border border-red-500/30">
              {/* Warning effect */}
              <div className="absolute inset-0 bg-red-500/5 rounded-xl animate-pulse" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6 text-red-400 flex items-center">
                  <span className="mr-3">☁️</span>
                  Traditional Cloud AI
                </h3>
                
                <div className="space-y-4">
                  {comparisonData.map((point, index) => (
                    <motion.div
                      key={point.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg bg-red-900/20 border border-red-500/20 transition-all cursor-pointer ${
                        selectedPoint === index ? 'ring-2 ring-red-400' : ''
                      }`}
                      onClick={() => setSelectedPoint(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <span>{point.icon}</span>
                          <span className="font-medium">{point.feature}</span>
                        </span>
                      </div>
                      <p className="text-red-300 mt-2 text-sm">{point.cloudAI}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Local AI Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative p-8 rounded-xl bg-gradient-to-br from-green-900/20 to-green-800/10 backdrop-blur-xl border border-green-500/30">
              {/* Success effect */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6 text-green-400 flex items-center">
                  <span className="mr-3">🏠</span>
                  Our Local AI Assistant
                </h3>
                
                <div className="space-y-4">
                  {comparisonData.map((point, index) => (
                    <motion.div
                      key={point.feature}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg bg-green-900/20 border border-green-500/20 transition-all cursor-pointer ${
                        selectedPoint === index ? 'ring-2 ring-green-400' : ''
                      }`}
                      onClick={() => setSelectedPoint(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <span>{point.icon}</span>
                          <span className="font-medium">{point.feature}</span>
                        </span>
                      </div>
                      <p className="text-green-300 mt-2 text-sm">{point.localAI}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Selected feature highlight */}
        <motion.div
          key={selectedPoint}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="max-w-4xl mx-auto p-8 rounded-xl bg-gradient-to-r from-card/60 to-card/80 backdrop-blur-xl border border-border">
            <h3 className="text-3xl font-bold mb-4 flex items-center justify-center">
              <span className="mr-3 text-4xl">{comparisonData[selectedPoint].icon}</span>
              {comparisonData[selectedPoint].feature}
            </h3>
            <div className="grid md:grid-cols-2 gap-8 mt-6">
              <div className="text-left">
                <h4 className="text-lg font-semibold text-red-400 mb-2">❌ Cloud AI Problem</h4>
                <p className="text-muted-foreground">{comparisonData[selectedPoint].cloudAI}</p>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-semibold text-green-400 mb-2">✅ Local AI Solution</h4>
                <p className="text-muted-foreground">{comparisonData[selectedPoint].localAI}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
