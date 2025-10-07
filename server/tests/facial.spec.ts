import { describe, it, expect } from 'vitest';
import { EmotionGuardService } from '../services/emotionGuard';

describe('Facial expression scoring', () => {
  const calc: any = (EmotionGuardService.prototype as any).calculateFacialExpressionScoreFromMetrics;

  it('returns 0 for missing or not-present metrics', () => {
    expect(calc.call(null, null)).toBe(0);
    expect(calc.call(null, { isPresent: false })).toBe(0);
  });

  it('returns near-zero score for calm metrics', () => {
    const calm = {
      isPresent: true,
      blinkRate: 12,
      eyeAspectRatio: 0.28,
      jawOpenness: 0.1,
      browFurrow: 0.12,
      gazeStability: 0.9,
    };

    const score = calc.call(null, calm);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.4);
  });

  it('returns high score for stressed metrics', () => {
    const stressed = {
      isPresent: true,
      blinkRate: 30,
      eyeAspectRatio: 0.01,
      jawOpenness: 0.8,
      browFurrow: 0.85,
      gazeStability: 0.2,
    };

    const score = calc.call(null, stressed);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});
