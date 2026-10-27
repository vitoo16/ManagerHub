import { useEffect, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useWorkspaceTransition(scope: RefObject<HTMLElement | null>, viewKey: string, reduced: boolean): void {
  useGSAP(() => {
    if (reduced) return;
    gsap.fromTo('[data-animate="workspace"]',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'all' });
  }, { scope, dependencies: [viewKey, reduced], revertOnUpdate: true });
}
