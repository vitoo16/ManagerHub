import type { RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
export { useReducedMotion } from './reduced';

gsap.registerPlugin(useGSAP);

export function useWorkspaceTransition(scope: RefObject<HTMLElement | null>, viewKey: string, reduced: boolean): void {
  useGSAP(() => {
    if (reduced) return;
    gsap.fromTo('[data-animate="workspace"]',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'all' });
  }, { scope, dependencies: [viewKey, reduced], revertOnUpdate: true });
}
