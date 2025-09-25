'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    title: "Welcome to Banterblogs!",
    content: "This blog documents the epic journey of building Banterpacks - a sophisticated multi-LLM system with real-time audio processing.",
    icon: "🎮",
    features: ["AI-powered storytelling", "Real development metrics", "Multi-LLM architecture"]
  },
  {
    id: 2,
    title: "What is Banterpacks?",
    content: "Banterpacks is a real-time, AI-powered banter overlay system for live gaming streams. It transforms gameplay moments into shareable highlights.",
    icon: "🤖",
    features: ["Sub-200ms latency", "Multi-LLM integration", "TTS/STT capabilities"]
  },
  {
    id: 3,
    title: "The AI Personalities",
    content: "Each episode features conversations between four AI personalities discussing technical decisions and development challenges.",
    icon: "🎭",
    features: ["Claude: Analytical & precise", "ChatGPT: Enthusiastic & creative", "Gemini: Philosophical & deep", "Banterpacks: Developer voice"]
  },
  {
    id: 4,
    title: "How to Navigate",
    content: "Explore episodes, learn about the technology, and follow the development journey from concept to production.",
    icon: "🧭",
    features: ["Episodes: Development stories", "Technology: Technical deep-dive", "Tags: Filter by topics", "Search: Find specific content"]
  }
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem('banterblogs-onboarding-completed', 'true');
    handleClose();
  };

  if (!isOpen) return null;

  const currentStepData = onboardingSteps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={skipOnboarding}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl mx-4 bg-background rounded-xl border border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-lg">{currentStepData.icon}</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{currentStepData.title}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    {onboardingSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index <= currentStep ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={skipOnboarding}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                {currentStepData.content}
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {currentStepData.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={skipOnboarding}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex items-center space-x-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <span>{currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
