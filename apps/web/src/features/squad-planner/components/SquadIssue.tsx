import { memo } from 'react';
import { useTranslation } from 'react-i18next';

function SquadIssue({reason}: {reason:string|null}) {
  const {t}=useTranslation();
  if(!reason)return null;
  const issue=reason.includes('pinned twice')?'You have assigned the same player to more than one position':
    reason.includes('both excluded and pinned')?'You cannot exclude a player while keeping them in the starting lineup':
    reason.includes('does not exist')?'This position is no longer available in the selected formation':
    reason.includes('not eligible')?'This player is not listed as eligible for that position in your export':
    reason.includes('not present')?'This player is not in the currently imported squad':
    reason.includes('No complete')?'There are not enough eligible players to fill all eleven positions':
    'These choices conflict, so the starting eleven cannot be completed';
  return <p>{t(issue)}</p>;
}

export default memo(SquadIssue);
