'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, type ReactNode } from 'react';
import { 
  X, 
  ArrowRight, 
  BookOpen, 
  Zap, 
  Eye, 
  Heart, 
  Sparkles,
  Target,
  CheckCircle
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  action?: string;
  highlight?: string;
}

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Banterblogs!',
      description: 'Discover the journey of building Banterpacks and Chimera Engine through interactive development episodes.',
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      action: 'Get Started'
    },
    {
      id: 'reading',
      title: 'Interactive Reading Experience',
      description: 'Enjoy beautiful typography, collapsible sections, code highlighting, and image zoom for the best reading experience.',
      icon: <BookOpen className="h-8 w-8 text-accent" />,
      highlight: 'Try clicking on code blocks to copy them!'
    },
    {
      id: 'navigation',
      title: 'Smart Navigation',
      description: 'Use the table of contents to jump between sections, track your reading progress, and navigate episodes seamlessly.',
      icon: <Target className="h-8 w-8 text-green-400" />,
      highlight: 'Table of contents appears on the left side'
    },
    {
      id: 'interactions',
      title: 'Rich Interactions',
      description: 'Like episodes, bookmark favorites, share with others, and track your reading statistics in real-time.',
      icon: <Heart className="h-8 w-8 text-red-400" />,
      highlight: 'Floating action bar appears when scrolling'
    },
    {
      id: 'performance',
      title: 'Performance Monitoring',
      description: 'See real-time performance metrics including FPS, memory usage, and network status for optimal experience.',
      icon: <Zap className="h-8 w-8 text-yellow-400" />,
      highlight: 'Performance metrics in the top-right corner'
    }
  ];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
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
            className="relative bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            {/* Close Button */}
            <button
              onClick={skipOnboarding}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Progress Indicator */}
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index <= currentStep ? 'bg-primary w-8' : 'bg-muted/50 w-2'
                    }`}
                    animate={{ width: index <= currentStep ? 32 : 8 }}
                  />
                ))}
              </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  {steps[currentStep].icon}
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-3">
                  {steps[currentStep].title}
                </h2>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {steps[currentStep].description}
                </p>

                {steps[currentStep].highlight && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6"
                  >
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">{steps[currentStep].highlight}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currentStep + 1} of {steps.length}
                </span>
              </div>

              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Skip Button */}
            <div className="text-center mt-4">
              <button
                onClick={skipOnboarding}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip onboarding
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface OnboardingTriggerProps {
  className?: string;
}

export function OnboardingTrigger({ className = '' }: OnboardingTriggerProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOnboarding(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary rounded-lg hover:from-primary/20 hover:to-accent/20 transition-all duration-300 ${className}`}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Take a Tour</span>
      </motion.button>

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </>
  );
}

interface FeatureHighlightProps {
  feature: string;
  description: string;
  icon: ReactNode;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function FeatureHighlight({ 
  feature, 
  description, 
  icon, 
  position, 
  className = '' 
}: FeatureHighlightProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const positionClasses = {
    'top-left': 'top-20 left-6',
    'top-right': 'top-20 right-6',
    'bottom-left': 'bottom-20 left-6',
    'bottom-right': 'bottom-20 right-6'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className={`fixed ${positionClasses[position]} z-40 ${className}`}
        >
          <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl max-w-xs">
            <div className="flex items-start gap-3">
              <div className="text-primary mt-1">
                {icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  {feature}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}