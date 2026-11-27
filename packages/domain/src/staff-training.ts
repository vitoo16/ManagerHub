export type CoachingCategoryId =
  | 'strength'
  | 'aerobic'
  | 'goalkeepers-shot-stopping'
  | 'goalkeepers-handling'
  | 'tactics'
  | 'ball-control'
  | 'defending'
  | 'attacking'
  | 'shooting';

export interface StaffCoachingAttributesInput {
  readonly attacking?: number | null;
  readonly defending?: number | null;
  readonly fitness?: number | null;
  readonly goalkeepers?: number | null;
  readonly mental?: number | null;
  readonly technical?: number | null;
  readonly tactical?: number | null;
  readonly motivating?: number | null;
  readonly levelOfDiscipline?: number | null;
  readonly determination?: number | null;
}

export interface CoachingCategoryRating {
  readonly id: CoachingCategoryId;
  readonly label: string;
  readonly stars: number;
  readonly rawScore: number;
  readonly fiveStarThreshold: number;
}

export interface StaffCoachingReport {
  readonly edition: 'FM2013';
  readonly ddm: number;
  readonly bestCategory: CoachingCategoryRating;
  readonly categories: readonly CoachingCategoryRating[];
}

const isRating20 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20;

function scoreToHalfStars(rawScore: number, step: number): number {
  const halfSteps = Math.floor(rawScore / step) + 1;
  return Math.min(5, Math.max(0.5, halfSteps * 0.5));
}

/**
 * Pure FM2013 5-star coaching rating estimator (0.5–5.0★ in half-star steps)
 * over decoded `NON_PLAYING_DATA` staff attributes.
 * Returns `null` if any required attribute is missing or outside `1..20`.
 */
export function evaluateFm2013StaffCoaching(
  attrs: StaffCoachingAttributesInput | null | undefined
): StaffCoachingReport | null {
  if (!attrs) return null;
  const {
    attacking,
    defending,
    fitness,
    goalkeepers,
    mental,
    technical,
    tactical,
    motivating,
    levelOfDiscipline,
    determination
  } = attrs;

  if (
    !isRating20(attacking) ||
    !isRating20(defending) ||
    !isRating20(fitness) ||
    !isRating20(goalkeepers) ||
    !isRating20(mental) ||
    !isRating20(technical) ||
    !isRating20(tactical) ||
    !isRating20(motivating) ||
    !isRating20(levelOfDiscipline) ||
    !isRating20(determination)
  ) {
    return null;
  }

  const ddm = determination + levelOfDiscipline + motivating;
  const fitnessScore = fitness * 9 + ddm * 2;
  const gkScore = goalkeepers * 2 + ddm;
  const tacticsScore = tactical * 2 + ddm;
  const ballControlScore = technical * 6 + mental * 3 + ddm * 2;
  const defendingScore = defending * 8 + (tactical + ddm) * 3;
  const attackingScore = attacking * 6 + tactical * 3 + ddm * 2;
  const shootingScore = technical * 6 + attacking * 3 + ddm * 2;

  const categories: CoachingCategoryRating[] = [
    { id: 'strength', label: 'Strength', stars: scoreToHalfStars(fitnessScore, 30), rawScore: fitnessScore, fiveStarThreshold: 270 },
    { id: 'aerobic', label: 'Aerobic', stars: scoreToHalfStars(fitnessScore, 30), rawScore: fitnessScore, fiveStarThreshold: 270 },
    { id: 'goalkeepers-shot-stopping', label: 'GK Shot Stopping', stars: scoreToHalfStars(gkScore, 10), rawScore: gkScore, fiveStarThreshold: 90 },
    { id: 'goalkeepers-handling', label: 'GK Handling', stars: scoreToHalfStars(gkScore, 10), rawScore: gkScore, fiveStarThreshold: 90 },
    { id: 'tactics', label: 'Tactics', stars: scoreToHalfStars(tacticsScore, 10), rawScore: tacticsScore, fiveStarThreshold: 90 },
    { id: 'ball-control', label: 'Ball Control', stars: scoreToHalfStars(ballControlScore, 30), rawScore: ballControlScore, fiveStarThreshold: 270 },
    { id: 'defending', label: 'Defending', stars: scoreToHalfStars(defendingScore, 40), rawScore: defendingScore, fiveStarThreshold: 360 },
    { id: 'attacking', label: 'Attacking', stars: scoreToHalfStars(attackingScore, 30), rawScore: attackingScore, fiveStarThreshold: 270 },
    { id: 'shooting', label: 'Shooting', stars: scoreToHalfStars(shootingScore, 30), rawScore: shootingScore, fiveStarThreshold: 270 }
  ];

  const bestCategory = [...categories].sort((a, b) => b.stars - a.stars || b.rawScore - a.rawScore)[0]!;

  return {
    edition: 'FM2013',
    ddm,
    bestCategory,
    categories
  };
}
