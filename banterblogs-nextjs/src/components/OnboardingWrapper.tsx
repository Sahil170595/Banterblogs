'use client';

import { useState, useEffect } from 'react';
import { OnboardingModal } from './OnboardingModal';

import Cookie from 'js-cookie';

export function OnboardingWrapper() {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = Cookie.get('seen-onboarding') === 'true';
    if (!hasSeenOnboarding) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setShouldShowModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShouldShowModal(false);
    // Set cookie to remember user has seen onboarding
    Cookie.set('seen-onboarding', 'true', { expires: 365 }); // Expires in 1 year
  };

  if (!shouldShowModal) return null;

  return <OnboardingModal onClose={handleClose} />;
}