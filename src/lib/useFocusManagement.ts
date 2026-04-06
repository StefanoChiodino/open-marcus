import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useFocusManagement hook
 * Moves focus to h1 on page navigation for screen reader announcement
 * and ensures keyboard users don't lose focus context after route changes.
 * Fulfills: VAL-UI-007 (keyboard navigation), VAL-UI-008 (screen reader support)
 */
export function useFocusManagement() {
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // When route changes, move focus to main content area
    const mainContent = document.querySelector('#main-content') as HTMLElement;
    if (mainContent) {
      mainContentRef.current = mainContent;
      
      // Find the first h1 or h2 in the new page content to focus
      const heading = mainContent.querySelector('h1, h2') as HTMLElement;
      
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
        heading.addEventListener('blur', () => {
          heading.removeAttribute('tabindex');
        }, { once: true });
      } else {
        // If no heading, focus the main content area itself
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        mainContent.addEventListener('blur', () => {
          mainContent.removeAttribute('tabindex');
        }, { once: true });
      }
    }
  }, [location.pathname]);

  return mainContentRef;
}
