import type { RefObject } from 'react';
import { useWorkspaceTransition } from '@managerhub/motion';

export default function WorkspaceAnimator({ scope, view, reduced }: {
  scope: RefObject<HTMLElement | null>;
  view: string;
  reduced: boolean;
}) {
  useWorkspaceTransition(scope, view, reduced);
  return null;
}
