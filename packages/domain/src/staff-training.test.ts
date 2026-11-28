import { describe, expect, it } from 'vitest';
import { evaluateFm2013StaffCoaching } from './staff-training';

describe('FM2013 5-star staff coaching rating calculator', () => {
  it('computes 5.0-star ratings for elite coaches and 0.5-star ratings for minimum coaches', () => {
    const elite = evaluateFm2013StaffCoaching({
      attacking: 20,
      defending: 20,
      fitness: 20,
      goalkeepers: 20,
      mental: 20,
      technical: 20,
      tactical: 20,
      motivating: 20,
      levelOfDiscipline: 20,
      determination: 20
    })!;
    expect(elite.ddm).toBe(60);
    expect(elite.categories).toHaveLength(9);
    expect(elite.categories.every(cat => cat.stars === 5)).toBe(true);

    const novice = evaluateFm2013StaffCoaching({
      attacking: 1,
      defending: 1,
      fitness: 1,
      goalkeepers: 1,
      mental: 1,
      technical: 1,
      tactical: 1,
      motivating: 1,
      levelOfDiscipline: 1,
      determination: 1
    })!;
    expect(novice.ddm).toBe(3);
    expect(novice.categories.every(cat => cat.stars === 0.5)).toBe(true);
  });

  it('identifies specialist categories accurately and reacts deterministically to attribute edits', () => {
    const fitnessCoach = evaluateFm2013StaffCoaching({
      attacking: 5,
      defending: 5,
      fitness: 20,
      goalkeepers: 2,
      mental: 10,
      technical: 8,
      tactical: 10,
      motivating: 16,
      levelOfDiscipline: 16,
      determination: 16
    })!;
    // DDM = 48; fitnessScore = 20*9 + 48*2 = 276 >= 270 -> 5.0 stars!
    expect(fitnessCoach.ddm).toBe(48);
    expect(fitnessCoach.categories.find(c => c.id === 'strength')?.stars).toBe(5);
    expect(fitnessCoach.categories.find(c => c.id === 'aerobic')?.stars).toBe(5);
    expect(fitnessCoach.categories.find(c => c.id === 'goalkeepers-handling')?.stars).toBe(3);
    expect(fitnessCoach.bestCategory.id).toBe('strength');
  });

  it('fails closed when attributes are missing or out of 1..20 integer range', () => {
    expect(evaluateFm2013StaffCoaching(null)).toBeNull();
    expect(evaluateFm2013StaffCoaching({ attacking: 20 })).toBeNull();
    expect(
      evaluateFm2013StaffCoaching({
        attacking: 21,
        defending: 10,
        fitness: 10,
        goalkeepers: 10,
        mental: 10,
        technical: 10,
        tactical: 10,
        motivating: 10,
        levelOfDiscipline: 10,
        determination: 10
      })
    ).toBeNull();
  });
});
