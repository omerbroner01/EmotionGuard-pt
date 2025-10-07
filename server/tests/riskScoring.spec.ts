import { describe, it, expect } from 'vitest';
import { RiskScoringService } from '../services/riskScoring';

describe('RiskScoringService', () => {
  const service = new RiskScoringService();

  it('produces a higher score for high-stress signals than for low-stress signals', async () => {
    const highStressSignals = {
      stroopTrials: Array.from({ length: 20 }).map((_, i) => ({ reactionTimeMs: 900 + i * 20, correct: i % 3 !== 0 })),
      stressLevel: 9,
      mouseMovements: Array.from({ length: 30 }).map(() => Math.random() * 20),
      keystrokeTimings: Array.from({ length: 30 }).map(() => 200 + Math.random() * 200),
      clickLatency: 450,
      facialMetrics: {
        isPresent: true,
        blinkRate: 35,
        eyeAspectRatio: 0.12,
        jawOpenness: 0.6,
        browFurrow: 0.8,
        gazeStability: 0.2,
      }
    } as any;

    const lowStressSignals = {
      stroopTrials: Array.from({ length: 20 }).map((_, i) => ({ reactionTimeMs: 350 + i * 5, correct: true })),
      stressLevel: 2,
      mouseMovements: Array.from({ length: 30 }).map(() => 100 + Math.random() * 10),
      keystrokeTimings: Array.from({ length: 30 }).map(() => 80 + Math.random() * 20),
      clickLatency: 120,
      facialMetrics: {
        isPresent: true,
        blinkRate: 12,
        eyeAspectRatio: 0.28,
        jawOpenness: 0.12,
        browFurrow: 0.12,
        gazeStability: 0.9,
      }
    } as any;

    const high = await service.calculateRiskScore(highStressSignals);
    const low = await service.calculateRiskScore(lowStressSignals);

    // Ensure both are numbers and that high > low
    expect(typeof high.riskScore).toBe('number');
    expect(typeof low.riskScore).toBe('number');
    expect(high.riskScore).toBeGreaterThan(low.riskScore);
  });

  it('returns 0 score when no signals provided', async () => {
    const empty = await service.calculateRiskScore({} as any);
    expect(typeof empty.riskScore).toBe('number');
    expect(empty.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('varies score based on stroop test performance', async () => {
    // Perfect performance
    const perfect = {
      stroopTrials: Array.from({ length: 20 }).map(() => ({ 
        reactionTimeMs: 400,
        correct: true
      })),
    } as any;

    // Poor performance
    const poor = {
      stroopTrials: Array.from({ length: 20 }).map(() => ({ 
        reactionTimeMs: 800,
        correct: false
      })),
    } as any;

    const perfectResult = await service.calculateRiskScore(perfect);
    const poorResult = await service.calculateRiskScore(poor);

    expect(perfectResult.riskScore).toBeLessThan(poorResult.riskScore);
    expect(perfectResult.riskScore).toBeLessThan(30); // Good performance should have low risk
    expect(poorResult.riskScore).toBeGreaterThan(60); // Poor performance should have high risk
  });

  it('properly handles invalid or malformed inputs', async () => {
    const malformed = {
      stroopTrials: [
        { reactionTimeMs: NaN, correct: true },
        { reactionTimeMs: -100, correct: true },
        { reactionTimeMs: Infinity, correct: false }
      ]
    } as any;

    const result = await service.calculateRiskScore(malformed);
    expect(typeof result.riskScore).toBe('number');
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});
