'use client';
import { useEffect } from 'react';
import { initSounds, unlockAudio, playClick } from '@/lib/sounds';

// Any element matching this selector gets the visual press + spring-back.
const SPRING_SELECTOR =
  '.btn-primary, .score-btn, .sched-chip, .theme-dot, .nav-icon, .status-pill, ' +
  '.study-topic-pill, button:not(.timer-btn):not(.mode-toggle), [data-spring]';

// Elements that already trigger a more specific sound explicitly in their
// own click handler (whoosh, tick, select, swish...) carry data-sound="none"
// so this default handler doesn't also fire a generic click underneath it.
const DEFAULT_CLICK_SELECTOR =
  'button:not(.timer-btn):not(.mode-toggle):not([data-sound="none"])';

export default function SpringPress() {
  useEffect(() => {
    initSounds();

    const press = (e) => {
      unlockAudio();

      const springEl = e.target?.closest?.(SPRING_SELECTOR);
      if (springEl) {
        springEl.classList.remove('spring-release');
        springEl.classList.add('is-pressed');
      }

      const clickEl = e.target?.closest?.(DEFAULT_CLICK_SELECTOR);
      if (clickEl) playClick();
    };

    const release = () => {
      document.querySelectorAll('.is-pressed').forEach((node) => {
        node.classList.remove('is-pressed');
        node.classList.add('spring-release');
        node.addEventListener(
          'animationend',
          () => node.classList.remove('spring-release'),
          { once: true }
        );
      });
    };

    document.addEventListener('pointerdown', press);
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);

    return () => {
      document.removeEventListener('pointerdown', press);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
    };
  }, []);

  return null;
}
