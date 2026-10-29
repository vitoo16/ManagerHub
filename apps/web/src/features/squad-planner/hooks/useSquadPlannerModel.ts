import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  FORMATIONS, declaredPositions, optimizeSquad,
  type FormationId, type PlayerDataset, type SquadPlanConfig, type SquadPlanKey, type SquadPlans, type SquadSolution
} from '@managerhub/domain';

type Inputs = {
  dataset: PlayerDataset | null;
  plans: SquadPlans;
  setPlans: Dispatch<SetStateAction<SquadPlans>>;
  active: SquadPlanKey;
  setActive: Dispatch<SetStateAction<SquadPlanKey>>;
};

export function useSquadPlannerModel({ dataset, plans, setPlans, active, setActive }: Inputs) {
  const plan = plans[active];

  // Keep the two optimizer results independent: editing Plan A must not rerun Plan B.
  const solutionA = useMemo(
    () => dataset ? optimizeSquad(dataset.players, plans.A.formation, plans.A) : null,
    [dataset?.players, plans.A]
  );
  const solutionB = useMemo(
    () => dataset ? optimizeSquad(dataset.players, plans.B.formation, plans.B) : null,
    [dataset?.players, plans.B]
  );
  const solutions = useMemo(
    () => solutionA && solutionB ? { A: solutionA, B: solutionB } : null,
    [solutionA, solutionB]
  );
  const solution: SquadSolution | null = active === 'A' ? solutionA : solutionB;
  const unknownPositions = useMemo(
    () => dataset?.players.filter(player => declaredPositions(player.position).size === 0).length ?? 0,
    [dataset?.players]
  );

  const update = useCallback((change: (current: SquadPlanConfig) => SquadPlanConfig) => {
    setPlans(previous => ({ ...previous, [active]: change(previous[active]) }));
  }, [active, setPlans]);

  const changeFormation = useCallback((next: FormationId) => update(current => {
    const valid = new Set(FORMATIONS[next].map(slot => slot.id));
    const lockedSlots = Object.fromEntries(Object.entries(current.lockedSlots).filter(([slot]) => valid.has(slot)));
    return { ...current, formation: next, lockedSlots };
  }), [update]);

  const onPin = useCallback((slotId: string, playerId: string | null) => update(current => {
    const lockedSlots = { ...current.lockedSlots };
    if (playerId) lockedSlots[slotId] = playerId;
    else delete lockedSlots[slotId];
    return { ...current, lockedSlots };
  }), [update]);

  const onExclude = useCallback((playerId: string, excluded: boolean) => update(current => ({
    ...current,
    excludedPlayerIds: excluded
      ? [...new Set([...current.excludedPlayerIds, playerId])]
      : current.excludedPlayerIds.filter(id => id !== playerId)
  })), [update]);

  const reset = useCallback(
    () => update(current => ({ ...current, lockedSlots: {}, excludedPlayerIds: [] })),
    [update]
  );

  const onCopyPlanAtoB = useCallback(() => {
    setPlans(previous => ({
      ...previous,
      B: {
        formation: previous.A.formation,
        lockedSlots: { ...previous.A.lockedSlots },
        excludedPlayerIds: [...previous.A.excludedPlayerIds]
      }
    }));
    setActive('B');
  }, [setPlans, setActive]);

  return useMemo(() => ({
    plan, solution, solutions, unknownPositions,
    changeFormation, onPin, onExclude, reset, onCopyPlanAtoB
  }), [plan, solution, solutions, unknownPositions, changeFormation, onPin, onExclude, reset, onCopyPlanAtoB]);
}
