import type { DecodedHiddenPlayingAttributes, DecodedPersonalityAttributes } from '@managerhub/domain/fm2013-offline';

export const HIDDEN_KEYS: readonly { readonly key: keyof DecodedHiddenPlayingAttributes; readonly label: string }[] = [
  { key: 'consistency', label: 'Consistency' },
  { key: 'importantMatches', label: 'Important Matches' },
  { key: 'injuryProneness', label: 'Injury Proneness' },
  { key: 'dirtiness', label: 'Dirtiness' },
  { key: 'versatility', label: 'Versatility' }
];

export const PERSONALITY_KEYS: readonly { readonly key: keyof DecodedPersonalityAttributes; readonly label: string }[] = [
  { key: 'adaptability', label: 'Adaptability' },
  { key: 'ambition', label: 'Ambition' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'sportsmanship', label: 'Sportsmanship' },
  { key: 'temperament', label: 'Temperament' },
  { key: 'controversy', label: 'Controversy' }
];

