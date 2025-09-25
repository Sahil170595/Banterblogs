'use client';

import { useState, useEffect } from 'react';
import { OnboardingModal } from './OnboardingModal';

export function OnboardingWrapper() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('banterblogs-onboarding-completed');
    
    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  return (
    <OnboardingModal 
      isOpen={showOnboarding} 
      onClose={handleCloseOnboarding} 
    />
  );
}
