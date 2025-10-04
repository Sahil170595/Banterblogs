'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Shield, Zap } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Banterblogs',
      content: 'Your gateway to the world\'s first fully autonomous personal AI platform.',
      icon: <Bot className="h-8 w-8" />,
    },
    {
      title: 'Privacy-First AI',
      content: 'Everything runs locally on your machine. No data leaves your computer.',
      icon: <Shield className="h-8 w-8" />,
    },
    {
      title: 'Live Development',
      content: 'Follow the journey in real-time as we build Jarvis from the ground up.',
      icon: <Zap className="h-8 w-8" />,
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const skipOnboarding = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={skipOnboarding}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4"
        >
          <div className="glass-pro rounded-2xl p-8 relative overflow-hidden">
            {/* Close button */}
            <button
              onClick={skipOnboarding}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-6">
              {/* Icon */}
              <motion.div
                key={currentStep}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex justify-center"
              >
                {steps[currentStep].icon}
              </motion.div>

              {/* Content */}
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-bold text-foreground">
                  {steps[currentStep].title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {steps[currentStep].content}
                </p>
              </motion.div>

              {/* Progress dots */}
              <div className="flex justify-center space-x-2">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentStep
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={skipOnboarding}
                  className="flex-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}